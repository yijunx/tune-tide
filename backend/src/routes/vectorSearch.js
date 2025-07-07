const express = require('express');
const router = express.Router();
const vectorSearchService = require('../services/vectorSearchService');

// Natural language search endpoint
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`Natural language search: "${query}"`);

    const songs = await vectorSearchService.searchSongsByNaturalLanguage(query.trim(), parseInt(limit));

    res.json({
      songs: songs,
      query: query,
      count: songs.length
    });
  } catch (error) {
    console.error('Error in natural language search:', error);
    res.status(500).json({ error: 'Failed to perform natural language search' });
  }
});

// Index all songs endpoint (admin only)
router.post('/index-all', async (req, res) => {
  try {
    console.log('Starting to index all songs...');
    
    // Start indexing in background
    vectorSearchService.indexAllSongs().catch(error => {
      console.error('Background indexing error:', error);
    });

    res.json({ 
      message: 'Started indexing all songs. This may take a while.',
      status: 'indexing'
    });
  } catch (error) {
    console.error('Error starting song indexing:', error);
    res.status(500).json({ error: 'Failed to start song indexing' });
  }
});

// Index specific song endpoint
router.post('/index-song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    
    await vectorSearchService.updateSongDescription(parseInt(songId));
    
    res.json({ 
      message: `Song ${songId} indexed successfully`,
      songId: parseInt(songId)
    });
  } catch (error) {
    console.error(`Error indexing song ${req.params.songId}:`, error);
    res.status(500).json({ error: 'Failed to index song' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test Weaviate connection
    const weaviateHealthy = await vectorSearchService.client.schema.getter().do()
      .then(() => true)
      .catch(() => false);

    // Test vLLM connection
    const vllmHealthy = await fetch('http://10.2.4.153:80/v1/models')
      .then(response => response.ok)
      .catch(() => false);

    // Test Infinity connection
    const infinityHealthy = await fetch('http://10.4.33.12:80/v1/models')
      .then(response => response.ok)
      .catch(() => false);

    res.json({
      status: 'ok',
      weaviate: weaviateHealthy ? 'connected' : 'disconnected',
      vllm: vllmHealthy ? 'connected' : 'disconnected',
      infinity: infinityHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

module.exports = router; 