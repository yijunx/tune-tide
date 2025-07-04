const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Record a song play
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { song_id } = req.body;
    if (!song_id) {
      return res.status(400).json({ error: 'song_id is required' });
    }

    // Verify the song exists
    const songCheck = await pool.query('SELECT id FROM songs WHERE id = $1', [song_id]);
    if (songCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Record the play
    const result = await pool.query(
      'INSERT INTO play_history (user_id, song_id) VALUES ($1, $2) RETURNING *',
      [req.user.id, song_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording play history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's play history with song details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        ph.id,
        ph.played_at,
        s.id as song_id,
        s.title,
        s.duration,
        s.audio_url,
        s.genre,
        ar.id as artist_id,
        ar.name as artist_name,
        al.id as album_id,
        al.title as album_title,
        al.artwork_url
      FROM play_history ph
      JOIN songs s ON ph.song_id = s.id
      JOIN artists ar ON s.artist_id = ar.id
      LEFT JOIN albums al ON s.album_id = al.id
      WHERE ph.user_id = $1
      ORDER BY ph.played_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching play history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get play history count for pagination
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM play_history WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error fetching play history count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear user's play history
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM play_history WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Play history cleared successfully' });
  } catch (error) {
    console.error('Error clearing play history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 