const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all comments for a song (public - no auth required)
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get comments with user information
    const commentsQuery = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.picture_url as user_picture_url
      FROM song_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.song_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM song_comments
      WHERE song_id = $1
    `;

    const [commentsResult, countResult] = await Promise.all([
      pool.query(commentsQuery, [songId, limit, offset]),
      pool.query(countQuery, [songId])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      comments: commentsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a new comment (requires authentication)
router.post('/song/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    // Check if song exists
    const songCheck = await pool.query('SELECT id FROM songs WHERE id = $1', [songId]);
    if (songCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Insert the comment
    const insertQuery = `
      INSERT INTO song_comments (song_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at, updated_at
    `;

    const result = await pool.query(insertQuery, [songId, userId, content.trim()]);
    const comment = result.rows[0];

    // Get user information for the response
    const userQuery = `
      SELECT id, name, picture_url
      FROM users
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [userId]);
    const user = userResult.rows[0];

    res.status(201).json({
      ...comment,
      user_id: user.id,
      user_name: user.name,
      user_picture_url: user.picture_url
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment (requires authentication and ownership)
router.put('/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    // Check if comment exists and user owns it
    const commentCheck = await pool.query(
      'SELECT id, user_id FROM song_comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update the comment
    const updateQuery = `
      UPDATE song_comments
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING id, content, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [content.trim(), commentId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = result.rows[0];

    // Get user information for the response
    const userQuery = `
      SELECT id, name, picture_url
      FROM users
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [userId]);
    const user = userResult.rows[0];

    res.json({
      ...comment,
      user_id: user.id,
      user_name: user.name,
      user_picture_url: user.picture_url
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (requires authentication and ownership)
router.delete('/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists and user owns it
    const commentCheck = await pool.query(
      'SELECT id, user_id FROM song_comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete the comment
    const deleteQuery = 'DELETE FROM song_comments WHERE id = $1 AND user_id = $2';
    const result = await pool.query(deleteQuery, [commentId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router; 