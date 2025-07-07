const express = require('express');
const pool = require('../config/database');
const vectorSearchService = require('../services/vectorSearchService');
const router = express.Router();

// Get all songs with artist and album info
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, naturalLanguage } = req.query;
    const offset = (page - 1) * limit;
    
    // If natural language search is requested, use vector search
    if (naturalLanguage && search) {
      try {
        const songs = await vectorSearchService.searchSongsByNaturalLanguage(search, parseInt(limit));
        
        res.json({
          songs: songs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: 1,
            totalItems: songs.length,
            itemsPerPage: parseInt(limit),
            hasNextPage: false,
            hasPrevPage: false
          },
          searchType: 'natural-language'
        });
        return;
      } catch (error) {
        console.error('Natural language search failed, falling back to text search:', error);
        // Fall back to regular text search
      }
    }
    
    let query, params;
    
    if (search) {
      // Enhanced search query with description field
      query = `
        SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        LEFT JOIN albums al ON s.album_id = al.id 
        WHERE to_tsvector('english', s.title || ' ' || ar.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('english', $1)
        ORDER BY ts_rank(to_tsvector('english', s.title || ' ' || ar.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')), plainto_tsquery('english', $1)) DESC
        LIMIT $2 OFFSET $3
      `;
      params = [search, limit, offset];
    } else {
      // Regular query with pagination, sorted by created_at desc
      query = `
        SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        LEFT JOIN albums al ON s.album_id = al.id 
        ORDER BY s.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    }
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination info
    let countQuery, countParams;
    if (search) {
      countQuery = `
        SELECT COUNT(*) as total
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        LEFT JOIN albums al ON s.album_id = al.id 
        WHERE to_tsvector('english', s.title || ' ' || ar.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('english', $1)
      `;
      countParams = [search];
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM songs';
      countParams = [];
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      songs: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      searchType: 'text'
    });
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

// Search songs (enhanced with description)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE to_tsvector('english', s.title || ' ' || ar.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(to_tsvector('english', s.title || ' ' || ar.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')), plainto_tsquery('english', $1)) DESC
    `, [query]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Natural language search endpoint
router.get('/natural-search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;
    
    const songs = await vectorSearchService.searchSongsByNaturalLanguage(query, parseInt(limit));
    
    res.json({
      songs: songs,
      query: query,
      count: songs.length,
      searchType: 'natural-language'
    });
  } catch (error) {
    console.error('Error in natural language search:', error);
    res.status(500).json({ error: 'Failed to perform natural language search' });
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
    const { title, artist_id, album_id, duration, audio_url, description } = req.body;
    
    if (!title || !artist_id) {
      return res.status(400).json({ error: 'Title and artist_id are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO songs (title, artist_id, album_id, duration, audio_url, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, artist_id, album_id, duration, audio_url, description]
    );
    
    // Index the new song in Weaviate
    const song = result.rows[0];
    
    // Get full song details for indexing
    const songDetails = await pool.query(`
      SELECT s.*, a.name as artist_name, al.title as album_title 
      FROM songs s 
      JOIN artists a ON s.artist_id = a.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.id = $1
    `, [song.id]);
    
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

// Update song
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist_id, album_id, duration, audio_url, description } = req.body;
    
    const result = await pool.query(
      'UPDATE songs SET title = $1, artist_id = $2, album_id = $3, duration = $4, audio_url = $5, description = $6 WHERE id = $7 RETURNING *',
      [title, artist_id, album_id, duration, audio_url, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    // Re-index the updated song in Weaviate
    const vectorSearchService = require('../services/vectorSearchService');
    
    // Get full song details for indexing
    const songDetails = await pool.query(`
      SELECT s.*, a.name as artist_name, al.title as album_title 
      FROM songs s 
      JOIN artists a ON s.artist_id = a.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.id = $1
    `, [id]);
    
    if (songDetails.rows.length > 0) {
      // Index in background
      vectorSearchService.indexSong(songDetails.rows[0]).catch(error => {
        console.error('Background indexing error for updated song:', error);
      });
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