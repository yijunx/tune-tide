const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all albums with artist info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, ar.name as artist_name 
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

// Get album by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*, ar.name as artist_name 
      FROM albums a 
      JOIN artists ar ON a.artist_id = ar.id 
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search albums
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(`
      SELECT a.*, ar.name as artist_name 
      FROM albums a 
      JOIN artists ar ON a.artist_id = ar.id 
      WHERE to_tsvector('english', a.title) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', ar.name) @@ plainto_tsquery('english', $1)
      ORDER BY a.title
    `, [query]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching albums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get albums by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const result = await pool.query(`
      SELECT a.*, ar.name as artist_name 
      FROM albums a 
      JOIN artists ar ON a.artist_id = ar.id 
      WHERE a.artist_id = $1 
      ORDER BY a.release_year DESC
    `, [artistId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching albums by artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new album
router.post('/', async (req, res) => {
  try {
    const { title, artist_id, release_year, artwork_url } = req.body;
    
    if (!title || !artist_id) {
      return res.status(400).json({ error: 'Title and artist_id are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO albums (title, artist_id, release_year, artwork_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, artist_id, release_year, artwork_url]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating album:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Album with this title already exists for this artist' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Artist not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update album
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist_id, release_year, artwork_url } = req.body;
    
    const result = await pool.query(
      'UPDATE albums SET title = $1, artist_id = $2, release_year = $3, artwork_url = $4 WHERE id = $5 RETURNING *',
      [title, artist_id, release_year, artwork_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete album
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM albums WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 