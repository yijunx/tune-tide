const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all songs with artist and album info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      ORDER BY s.title
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search songs
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE to_tsvector('english', s.title) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', ar.name) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', al.title) @@ plainto_tsquery('english', $1)
      ORDER BY s.title
    `, [query]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get songs by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.artist_id = $1 
      ORDER BY s.title
    `, [artistId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching songs by artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get songs by album
router.get('/album/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.album_id = $1 
      ORDER BY s.title
    `, [albumId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching songs by album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new song
router.post('/', async (req, res) => {
  try {
    const { title, artist_id, album_id, duration, audio_url } = req.body;
    
    if (!title || !artist_id) {
      return res.status(400).json({ error: 'Title and artist_id are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO songs (title, artist_id, album_id, duration, audio_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, artist_id, album_id, duration, audio_url]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating song:', error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Artist or album not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist_id, album_id, duration, audio_url } = req.body;
    
    const result = await pool.query(
      'UPDATE songs SET title = $1, artist_id = $2, album_id = $3, duration = $4, audio_url = $5 WHERE id = $6 RETURNING *',
      [title, artist_id, album_id, duration, audio_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete song
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM songs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 