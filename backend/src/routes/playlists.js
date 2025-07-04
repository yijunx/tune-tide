const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all playlists
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM playlists ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get playlist by ID with songs
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get playlist info
    const playlistResult = await pool.query('SELECT * FROM playlists WHERE id = $1', [id]);
    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Get songs in playlist
    const songsResult = await pool.query(`
      SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url, ps.position
      FROM playlist_songs ps
      JOIN songs s ON ps.song_id = s.id
      JOIN artists ar ON s.artist_id = ar.id
      LEFT JOIN albums al ON s.album_id = al.id
      WHERE ps.playlist_id = $1
      ORDER BY ps.position
    `, [id]);
    
    const playlist = playlistResult.rows[0];
    playlist.songs = songsResult.rows;
    
    res.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new playlist
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO playlists (name) VALUES ($1) RETURNING *',
      [name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update playlist
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const result = await pool.query(
      'UPDATE playlists SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete playlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM playlists WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add song to playlist
router.post('/:id/songs', async (req, res) => {
  try {
    const { id } = req.params;
    const { song_id } = req.body;
    
    if (!song_id) {
      return res.status(400).json({ error: 'song_id is required' });
    }
    
    // Get next position
    const positionResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM playlist_songs WHERE playlist_id = $1',
      [id]
    );
    const nextPosition = positionResult.rows[0].next_position;
    
    const result = await pool.query(
      'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) RETURNING *',
      [id, song_id, nextPosition]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Song already in playlist' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Playlist or song not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', async (req, res) => {
  try {
    const { id, songId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING *',
      [id, songId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found in playlist' });
    }
    
    res.json({ message: 'Song removed from playlist successfully' });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 