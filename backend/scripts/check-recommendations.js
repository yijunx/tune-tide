const { Pool } = require('pg');
require('dotenv').config();

async function checkRecommendations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('=== Checking Current Recommendation State ===\n');

    // Check current user preferences
    console.log('1. Current user preferences:');
    const preferences = await pool.query(`
      SELECT * FROM user_preferences 
      WHERE user_id = 1 
      ORDER BY preference_score DESC;
    `);
    console.log('User preferences:', preferences.rows);

    // Check recommendation cache
    console.log('\n2. Current recommendation cache:');
    const recommendations = await pool.query(`
      SELECT rc.*, s.title, ar.name as artist_name
      FROM recommendation_cache rc
      JOIN songs s ON rc.song_id = s.id
      JOIN artists ar ON s.artist_id = ar.id
      WHERE rc.user_id = 1
      ORDER BY rc.score DESC;
    `);
    console.log('Recommendations:', recommendations.rows);

    // Check play history count
    console.log('\n3. Play history count:');
    const history = await pool.query(`
      SELECT COUNT(*) as play_count FROM play_history WHERE user_id = 1;
    `);
    console.log('Play count:', history.rows[0]);

    // Check if there are songs not in play history
    console.log('\n4. Songs not in play history:');
    const unplayedSongs = await pool.query(`
      SELECT s.id, s.title, ar.name as artist_name, s.genre
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      WHERE s.id NOT IN (
        SELECT song_id FROM play_history WHERE user_id = 1
      )
      LIMIT 10;
    `);
    console.log('Unplayed songs:', unplayedSongs.rows);

    // Check top artists from play history
    console.log('\n5. Top artists from play history:');
    const topArtists = await pool.query(`
      SELECT ar.name, COUNT(*) as play_count
      FROM play_history ph
      JOIN songs s ON ph.song_id = s.id
      JOIN artists ar ON s.artist_id = ar.id
      WHERE ph.user_id = 1
      GROUP BY ar.id, ar.name
      ORDER BY play_count DESC
      LIMIT 5;
    `);
    console.log('Top artists:', topArtists.rows);

    // Check top genres from play history
    console.log('\n6. Top genres from play history:');
    const topGenres = await pool.query(`
      SELECT s.genre, COUNT(*) as play_count
      FROM play_history ph
      JOIN songs s ON ph.song_id = s.id
      WHERE ph.user_id = 1 AND s.genre IS NOT NULL
      GROUP BY s.genre
      ORDER BY play_count DESC
      LIMIT 5;
    `);
    console.log('Top genres:', topGenres.rows);

    await pool.end();
    
  } catch (error) {
    console.error('Error checking recommendations:', error);
    await pool.end();
    process.exit(1);
  }
}

checkRecommendations(); 