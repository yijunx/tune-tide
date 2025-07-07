const express = require('express');
const router = express.Router();
const communityService = require('../services/communityService');
const { authenticateToken } = require('../middleware/auth');

// Get all public communities
router.get('/public', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const communities = await communityService.getPublicCommunities(parseInt(limit), parseInt(offset));
    res.json(communities);
  } catch (error) {
    console.error('Error fetching public communities:', error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get communities by genre
router.get('/genre/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const communities = await communityService.getCommunitiesByGenre(genre, parseInt(limit), parseInt(offset));
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities by genre:', error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get user's communities (requires auth)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const communities = await communityService.getUserCommunities(req.user.id);
    res.json(communities);
  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(500).json({ error: 'Failed to fetch user communities' });
  }
});

// Get recommended communities (requires auth)
router.get('/recommended', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const communities = await communityService.getRecommendedCommunities(req.user.id, parseInt(limit));
    res.json(communities);
  } catch (error) {
    console.error('Error fetching recommended communities:', error);
    res.status(500).json({ error: 'Failed to fetch recommended communities' });
  }
});

// Get community details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const community = await communityService.getCommunityById(parseInt(id), req.user.id);
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    res.json(community);
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// Create a new community (requires auth)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, genre, isPublic } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }
    
    const community = await communityService.createCommunity({
      name,
      description,
      genre,
      isPublic
    }, req.user.id);
    
    res.status(201).json(community);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// Join a community (requires auth)
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await communityService.joinCommunity(parseInt(id), req.user.id);
    res.json({ success: true, message: 'Successfully joined community' });
  } catch (error) {
    console.error('Error joining community:', error);
    if (error.message === 'User is already a member of this community') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to join community' });
    }
  }
});

// Leave a community (requires auth)
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await communityService.leaveCommunity(parseInt(id), req.user.id);
    res.json({ success: true, message: 'Successfully left community' });
  } catch (error) {
    console.error('Error leaving community:', error);
    if (error.message === 'Community creator cannot leave the community') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to leave community' });
    }
  }
});

// Get community posts
router.get('/:id/posts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const posts = await communityService.getCommunityPosts(parseInt(id), parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({ error: 'Failed to fetch community posts' });
  }
});

// Create a post in a community (requires auth)
router.post('/:id/posts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, songId, postType } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const post = await communityService.createPost({
      communityId: parseInt(id),
      title,
      content,
      songId,
      postType
    }, req.user.id);
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.message === 'You must be a member of this community to post') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
});

// Like/unlike a post (requires auth)
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await communityService.togglePostLike(parseInt(postId), req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error toggling post like:', error);
    res.status(500).json({ error: 'Failed to toggle post like' });
  }
});

module.exports = router; 