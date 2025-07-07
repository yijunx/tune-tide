const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const recommendationService = require('../services/recommendationService');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get personalized recommendations
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user.id;

    const recommendations = await recommendationService.getRecommendations(userId, parseInt(limit));

    res.json({
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's top genres
router.get('/genres', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const userId = req.user.id;

    const genres = await recommendationService.getUserTopGenres(userId, parseInt(limit));

    res.json(genres);
  } catch (error) {
    console.error('Error fetching user genres:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's top artists
router.get('/artists', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const userId = req.user.id;

    const artists = await recommendationService.getUserTopArtists(userId, parseInt(limit));

    res.json(artists);
  } catch (error) {
    console.error('Error fetching user artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Force regenerate recommendations
router.post('/regenerate', async (req, res) => {
  try {
    const userId = req.user.id;

    await recommendationService.generateRecommendations(userId);

    res.json({ message: 'Recommendations regenerated successfully' });
  } catch (error) {
    console.error('Error regenerating recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 