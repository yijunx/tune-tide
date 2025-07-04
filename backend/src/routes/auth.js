const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Google OAuth login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Check if user is admin
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
      const isAdmin = adminEmails.includes(req.user.email);

      // Update or create user in database
      const result = await pool.query(
        `INSERT INTO users (google_id, email, name, picture_url, is_admin) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (google_id) 
         DO UPDATE SET 
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           picture_url = EXCLUDED.picture_url,
           is_admin = EXCLUDED.is_admin
         RETURNING *`,
        [req.user.googleId, req.user.email, req.user.name, req.user.picture, isAdmin]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    picture_url: req.user.picture_url,
    is_admin: req.user.is_admin
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Check if user is admin
router.get('/admin-check', authenticateToken, (req, res) => {
  res.json({ is_admin: req.user.is_admin });
});

module.exports = router; 