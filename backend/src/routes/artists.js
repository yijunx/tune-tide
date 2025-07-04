const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all artists
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artists ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM artists WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search artists
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(
      'SELECT * FROM artists WHERE to_tsvector(\'english\', name) @@ plainto_tsquery(\'english\', $1) ORDER BY name',
      [query]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new artist
router.post('/', async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO artists (name, bio) VALUES ($1, $2) RETURNING *',
      [name, bio]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating artist:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Artist with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update artist
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio } = req.body;
    
    const result = await pool.query(
      'UPDATE artists SET name = $1, bio = $2 WHERE id = $3 RETURNING *',
      [name, bio, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete artist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM artists WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 