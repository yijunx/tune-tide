const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const artistsRouter = require('./routes/artists');
const albumsRouter = require('./routes/albums');
const songsRouter = require('./routes/songs');
const playlistsRouter = require('./routes/playlists');
const uploadRouter = require('./routes/upload');
const audioRouter = require('./routes/audio');

// Routes
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/audio', audioRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TuneTide API is running' });
});

// Global search endpoint
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const pool = require('./config/database');
    
    // Search across songs, artists, and albums
    const songsResult = await pool.query(`
      SELECT 'song' as type, s.id, s.title as name, ar.name as artist_name, al.title as album_title, al.artwork_url
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE to_tsvector('english', s.title) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', ar.name) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', al.title) @@ plainto_tsquery('english', $1)
    `, [query]);
    
    const artistsResult = await pool.query(`
      SELECT 'artist' as type, id, name, bio
      FROM artists 
      WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1)
    `, [query]);
    
    const albumsResult = await pool.query(`
      SELECT 'album' as type, a.id, a.title as name, ar.name as artist_name, a.artwork_url
      FROM albums a 
      JOIN artists ar ON a.artist_id = ar.id 
      WHERE to_tsvector('english', a.title) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', ar.name) @@ plainto_tsquery('english', $1)
    `, [query]);
    
    res.json({
      songs: songsResult.rows,
      artists: artistsResult.rows,
      albums: albumsResult.rows
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`TuneTide API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 