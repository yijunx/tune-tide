const express = require('express');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadFile, uploadAudioFile } = require('../config/minio');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all artists for dropdown
router.get('/artists', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM artists ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all albums for dropdown
router.get('/albums', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.title, ar.name as artist_name 
      FROM albums a 
      JOIN artists ar ON a.artist_id = ar.id 
      ORDER BY a.title
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new artist
router.post('/artists', async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Artist name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO artists (name, bio) VALUES ($1, $2) RETURNING *',
      [name, bio]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating artist:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Artist already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new album
router.post('/albums', upload.single('artwork'), async (req, res) => {
  try {
    const { title, artist_id, release_year } = req.body;
    
    if (!title || !artist_id) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }
    
    let artwork_url = null;
    
    // Upload artwork if provided
    if (req.file) {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      artwork_url = await uploadFile(req.file.buffer, fileName, req.file.mimetype);
    }
    
    const result = await pool.query(
      'INSERT INTO albums (title, artist_id, release_year, artwork_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, artist_id, release_year, artwork_url]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating album:', error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Artist not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new song
router.post('/songs', upload.single('audio'), async (req, res) => {
  try {
    const { title, artist_id, album_id, duration, genre, description } = req.body;
    
    if (!title || !artist_id) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }
    
    let audio_url = null;
    
    // Upload audio file if provided
    if (req.file) {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      audio_url = await uploadAudioFile(req.file.buffer, fileName, req.file.mimetype);
    }
    
    // Try to insert with genre and description first, fallback to without if columns don't exist
    let result;
    try {
      result = await pool.query(
        'INSERT INTO songs (title, artist_id, album_id, duration, audio_url, genre, description, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [title, artist_id, album_id, duration, audio_url, genre, description, req.user.id]
      );
    } catch (error) {
      if (error.code === '42703') { // Column doesn't exist
        console.log('Genre or description column not found, inserting without them');
        try {
          result = await pool.query(
            'INSERT INTO songs (title, artist_id, album_id, duration, audio_url, genre, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, artist_id, album_id, duration, audio_url, genre, req.user.id]
          );
        } catch (error2) {
          if (error2.code === '42703') { // Still column doesn't exist
            console.log('Genre column also not found, inserting without genre');
            result = await pool.query(
              'INSERT INTO songs (title, artist_id, album_id, duration, audio_url, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
              [title, artist_id, album_id, duration, audio_url, req.user.id]
            );
          } else {
            throw error2;
          }
        }
      } else {
        throw error;
      }
    }
    
    // Index the new song in Weaviate
    const vectorSearchService = require('../services/vectorSearchService');
    
    // Get full song details for indexing
    const songDetails = await pool.query(`
      SELECT s.*, a.name as artist_name, al.title as album_title 
      FROM songs s 
      JOIN artists a ON s.artist_id = a.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.id = $1
    `, [result.rows[0].id]);
    
    if (songDetails.rows.length > 0) {
      // Index in background
      vectorSearchService.indexSong(songDetails.rows[0]).catch(error => {
        console.error('Background indexing error for new song:', error);
      });
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating song:', error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Artist or album not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM songs'),
      pool.query('SELECT COUNT(*) as count FROM artists'),
      pool.query('SELECT COUNT(*) as count FROM albums'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM playlists')
    ]);
    
    res.json({
      songs: parseInt(stats[0].rows[0].count),
      artists: parseInt(stats[1].rows[0].count),
      albums: parseInt(stats[2].rows[0].count),
      users: parseInt(stats[3].rows[0].count),
      playlists: parseInt(stats[4].rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 