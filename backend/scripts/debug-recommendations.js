const { Pool } = require('pg');
require('dotenv').config();

async function debugRecommendations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('=== Debugging Recommendation System ===\n');

    // --- FULL RESET: Remove all user_preferences rows ---
    console.log('\nFULL RESET: Removing all user_preferences rows...');
    await pool.query('DELETE FROM user_preferences;');

    // Check user_preferences table structure
    console.log('1. Checking user_preferences table structure:');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences'
      ORDER BY ordinal_position;
    `);
    console.log(tableInfo.rows);

    // Check current user preferences
    console.log('\n2. Checking current user preferences:');
    const preferences = await pool.query(`
      SELECT * FROM user_preferences 
      WHERE user_id = 1 
      ORDER BY preference_score DESC;
    `);
    console.log('User preferences:', preferences.rows);

    // Check recommendation cache
    console.log('\n3. Checking recommendation cache:');
    const recommendations = await pool.query(`
      SELECT * FROM recommendation_cache 
      WHERE user_id = 1;
    `);
    console.log('Recommendations:', recommendations.rows);

    // Check play history
    console.log('\n4. Checking play history:');
    const history = await pool.query(`
      SELECT COUNT(*) as play_count FROM play_history WHERE user_id = 1;
    `);
    console.log('Play count:', history.rows[0]);

    // Check songs with genres
    console.log('\n5. Checking songs with genres:');
    const songsWithGenres = await pool.query(`
      SELECT s.id, s.title, s.genre, ar.name as artist_name
      FROM songs s 
      JOIN artists ar ON s.artist_id = ar.id 
      WHERE s.genre IS NOT NULL 
      LIMIT 5;
    `);
    console.log('Songs with genres:', songsWithGenres.rows);

    // Fix duplicate genre entries
    console.log('\n6. Fixing duplicate genre entries...');
    await pool.query(`
      DELETE FROM user_preferences 
      WHERE user_id = 1 AND genre IS NOT NULL AND artist_id IS NULL
      AND id NOT IN (
        SELECT MIN(id) 
        FROM user_preferences 
        WHERE user_id = 1 AND genre IS NOT NULL AND artist_id IS NULL
        GROUP BY genre
      );
    `);

    // Update aggregated preferences
    console.log('\n7. Updating aggregated preferences...');
    await pool.query(`
      UPDATE user_preferences 
      SET 
        play_count = (
          SELECT COUNT(*) 
          FROM play_history ph 
          JOIN songs s ON ph.song_id = s.id 
          WHERE ph.user_id = user_preferences.user_id 
          AND (
            (user_preferences.artist_id IS NOT NULL AND s.artist_id = user_preferences.artist_id)
            OR (user_preferences.genre IS NOT NULL AND s.genre = user_preferences.genre)
          )
        ),
        preference_score = LEAST(play_count * 0.1, 1.0)
      WHERE user_id = 1;
    `);

    // Clear and regenerate recommendations
    console.log('\n8. Clearing and regenerating recommendations...');
    await pool.query('DELETE FROM recommendation_cache WHERE user_id = 1');

    // Get updated preferences
    const updatedPrefs = await pool.query(`
      SELECT artist_id, genre, preference_score, play_count
      FROM user_preferences 
      WHERE user_id = 1 
      ORDER BY preference_score DESC, play_count DESC 
      LIMIT 10;
    `);
    console.log('Updated preferences:', updatedPrefs.rows);

    // Generate recommendations manually
    const newRecommendations = [];
    for (const pref of updatedPrefs.rows) {
      if (pref.artist_id) {
        const artistSongs = await pool.query(`
          SELECT s.id, s.title, ar.name as artist_name
          FROM songs s 
          JOIN artists ar ON s.artist_id = ar.id 
          WHERE s.artist_id = $1 AND s.id NOT IN (
            SELECT song_id FROM play_history WHERE user_id = 1
          )
          LIMIT 3
        `, [pref.artist_id]);

        artistSongs.rows.forEach(song => {
          newRecommendations.push({
            song_id: song.id,
            score: parseFloat(pref.preference_score) * 0.8,
            reason: `Based on your love for ${song.artist_name}`
          });
        });
      }

      if (pref.genre) {
        const genreSongs = await pool.query(`
          SELECT s.id, s.title, ar.name as artist_name
          FROM songs s 
          JOIN artists ar ON s.artist_id = ar.id 
          WHERE s.genre = $1 AND s.id NOT IN (
            SELECT song_id FROM play_history WHERE user_id = 1
          )
          LIMIT 3
        `, [pref.genre]);

        genreSongs.rows.forEach(song => {
          newRecommendations.push({
            song_id: song.id,
            score: parseFloat(pref.preference_score) * 0.6,
            reason: `Based on your love for ${pref.genre} music`
          });
        });
      }
    }

    // Remove duplicates and store
    const uniqueRecommendations = newRecommendations.reduce((acc, rec) => {
      if (!acc.find(r => r.song_id === rec.song_id)) {
        acc.push(rec);
      }
      return acc;
    }, []).sort((a, b) => b.score - a.score);

    console.log('Generated recommendations:', uniqueRecommendations);

    for (const rec of uniqueRecommendations.slice(0, 10)) {
      await pool.query(`
        INSERT INTO recommendation_cache (user_id, song_id, score, reason)
        VALUES ($1, $2, $3, $4)
      `, [1, rec.song_id, rec.score, rec.reason]);
    }

    console.log('\n9. Final check - recommendations:');
    const finalRecs = await pool.query(`
      SELECT rc.*, s.title, ar.name as artist_name
      FROM recommendation_cache rc
      JOIN songs s ON rc.song_id = s.id
      JOIN artists ar ON s.artist_id = ar.id
      WHERE rc.user_id = 1
      ORDER BY rc.score DESC;
    `);
    console.log('Final recommendations:', finalRecs.rows);

    // --- CLEANUP: Remove duplicate user_preferences rows ---
    console.log('\nCLEANUP: Removing duplicate user_preferences rows...');
    await pool.query(`
      DELETE FROM user_preferences
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM user_preferences
        GROUP BY user_id, artist_id, genre
      );
    `);

    // --- Add unique indexes for artist and genre preferences ---
    console.log('\nAdding unique indexes for user_preferences...');
    await pool.query(`
      DO $$ BEGIN
        BEGIN
          CREATE UNIQUE INDEX unique_user_artist ON user_preferences(user_id, artist_id) WHERE genre IS NULL;
        EXCEPTION WHEN duplicate_table THEN RAISE NOTICE 'unique_user_artist already exists'; END;
        BEGIN
          CREATE UNIQUE INDEX unique_user_genre ON user_preferences(user_id, genre) WHERE artist_id IS NULL;
        EXCEPTION WHEN duplicate_table THEN RAISE NOTICE 'unique_user_genre already exists'; END;
      END $$;
    `);

    await pool.end();
    
  } catch (error) {
    console.error('Error debugging recommendations:', error);
    await pool.end();
    process.exit(1);
  }
}

debugRecommendations(); 