const pool = require('../config/database');

class RecommendationService {
  // Update user preferences when a song is played
  async updateUserPreferences(userId, songId) {
    console.log(`Updating preferences for user ${userId}, song ${songId}`);
    const client = await pool.connect();
    try {
      // Get song details
      const songResult = await client.query(`
        SELECT s.*, ar.name as artist_name, ar.id as artist_id, s.genre
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        WHERE s.id = $1
      `, [songId]);

      if (songResult.rows.length === 0) {
        console.log(`Song ${songId} not found`);
        return;
      }

      const song = songResult.rows[0];
      console.log(`Found song: ${song.title} by ${song.artist_name}, genre: ${song.genre}`);

      // Update artist preference
      console.log(`Updating artist preference for artist ${song.artist_id}`);
      await client.query(`
        INSERT INTO user_preferences (user_id, artist_id, preference_score, play_count, last_played)
        VALUES ($1, $2, 0.1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, artist_id) WHERE genre IS NULL
        DO UPDATE SET 
          preference_score = LEAST(user_preferences.preference_score + 0.1, 1.0),
          play_count = user_preferences.play_count + 1,
          last_played = CURRENT_TIMESTAMP;
      `, [userId, song.artist_id]);
      console.log(`Artist preference updated`);

      // Update genre preference if genre exists
      if (song.genre) {
        console.log(`Updating genre preference for genre ${song.genre}`);
        await client.query(`
          INSERT INTO user_preferences (user_id, genre, preference_score, play_count, last_played)
          VALUES ($1, $2, 0.1, 1, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, genre) WHERE artist_id IS NULL
          DO UPDATE SET 
            preference_score = LEAST(user_preferences.preference_score + 0.1, 1.0),
            play_count = user_preferences.play_count + 1,
            last_played = CURRENT_TIMESTAMP;
        `, [userId, song.genre]);
        console.log(`Genre preference updated`);
      }

      // Clear old recommendations and generate new ones
      console.log(`Generating recommendations`);
      await this.generateRecommendations(userId);
      console.log(`Recommendations generated`);

    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate recommendations for a user
  async generateRecommendations(userId) {
    console.log(`Generating recommendations for user ${userId}`);
    const client = await pool.connect();
    try {
      // Clear old recommendations
      await client.query('DELETE FROM recommendation_cache WHERE user_id = $1', [userId]);
      console.log(`Cleared old recommendations`);

      // Get user's top preferences
      const preferencesResult = await client.query(`
        SELECT artist_id, genre, preference_score, play_count
        FROM user_preferences 
        WHERE user_id = $1 
        ORDER BY preference_score DESC, play_count DESC 
        LIMIT 10
      `, [userId]);

      console.log(`Found ${preferencesResult.rows.length} preferences`);

      if (preferencesResult.rows.length === 0) {
        // No preferences yet, recommend popular songs
        console.log(`No preferences found, recommending popular songs`);
        await this.recommendPopularSongs(userId);
        return;
      }

      const recommendations = [];

      // Generate recommendations based on preferences
      for (const pref of preferencesResult.rows) {
        console.log(`Processing preference:`, pref);
        
        if (pref.artist_id) {
          // Recommend songs from favorite artists
          console.log(`Finding songs for artist ${pref.artist_id}`);
          const artistSongs = await client.query(`
            SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
            FROM songs s 
            JOIN artists ar ON s.artist_id = ar.id 
            LEFT JOIN albums al ON s.album_id = al.id 
            WHERE s.artist_id = $1 AND s.id NOT IN (
              SELECT song_id FROM play_history WHERE user_id = $2
            )
            ORDER BY s.created_at DESC
            LIMIT 5
          `, [pref.artist_id, userId]);

          console.log(`Found ${artistSongs.rows.length} unplayed songs for artist ${pref.artist_id}`);

          artistSongs.rows.forEach(song => {
            recommendations.push({
              song_id: song.id,
              score: pref.preference_score * 0.8,
              reason: `Based on your love for ${pref.artist_name}`
            });
          });
        }

        if (pref.genre) {
          // Recommend songs from favorite genres
          console.log(`Finding songs for genre ${pref.genre}`);
          const genreSongs = await client.query(`
            SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url
            FROM songs s 
            JOIN artists ar ON s.artist_id = ar.id 
            LEFT JOIN albums al ON s.album_id = al.id 
            WHERE s.genre = $1 AND s.id NOT IN (
              SELECT song_id FROM play_history WHERE user_id = $2
            )
            ORDER BY s.created_at DESC
            LIMIT 5
          `, [pref.genre, userId]);

          console.log(`Found ${genreSongs.rows.length} unplayed songs for genre ${pref.genre}`);

          genreSongs.rows.forEach(song => {
            recommendations.push({
              song_id: song.id,
              score: pref.preference_score * 0.6,
              reason: `Based on your love for ${pref.genre} music`
            });
          });
        }
      }

      console.log(`Generated ${recommendations.length} recommendations before deduplication`);

      // Remove duplicates and sort by score
      const uniqueRecommendations = recommendations.reduce((acc, rec) => {
        if (!acc.find(r => r.song_id === rec.song_id)) {
          acc.push(rec);
        }
        return acc;
      }, []).sort((a, b) => b.score - a.score);

      console.log(`After deduplication: ${uniqueRecommendations.length} recommendations`);

      // Fallback: If no recommendations, recommend popular songs
      if (uniqueRecommendations.length === 0) {
        console.log('No unique recommendations found, recommending popular songs as fallback');
        await this.recommendPopularSongs(userId);
        return;
      }

      // Store top 20 recommendations
      const topRecommendations = uniqueRecommendations.slice(0, 20);
      
      for (const rec of topRecommendations) {
        await client.query(`
          INSERT INTO recommendation_cache (user_id, song_id, score, reason)
          VALUES ($1, $2, $3, $4)
        `, [userId, rec.song_id, rec.score, rec.reason]);
      }

      console.log(`Stored ${topRecommendations.length} recommendations in cache`);

    } catch (error) {
      console.error('Error in generateRecommendations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Recommend popular songs for new users
  async recommendPopularSongs(userId) {
    const client = await pool.connect();
    try {
      const popularSongs = await client.query(`
        SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url,
               COUNT(ph.id) as play_count
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        LEFT JOIN albums al ON s.album_id = al.id 
        LEFT JOIN play_history ph ON s.id = ph.song_id
        GROUP BY s.id, ar.name, al.title, al.artwork_url
        ORDER BY play_count DESC, s.created_at DESC
        LIMIT 20
      `);

      for (const song of popularSongs.rows) {
        await client.query(`
          INSERT INTO recommendation_cache (user_id, song_id, score, reason)
          VALUES ($1, $2, $3, $4)
        `, [userId, song.id, 0.5, 'Popular songs you might like']);
      }

    } finally {
      client.release();
    }
  }

  // Get recommendations for a user
  async getRecommendations(userId, limit = 20) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, ar.name as artist_name, al.title as album_title, al.artwork_url,
               rc.score, rc.reason
        FROM recommendation_cache rc
        JOIN songs s ON rc.song_id = s.id
        JOIN artists ar ON s.artist_id = ar.id
        LEFT JOIN albums al ON s.album_id = al.id
        WHERE rc.user_id = $1
        ORDER BY rc.score DESC, rc.created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get user's top genres
  async getUserTopGenres(userId, limit = 5) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT genre, preference_score, play_count
        FROM user_preferences 
        WHERE user_id = $1 AND genre IS NOT NULL
        ORDER BY preference_score DESC, play_count DESC 
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get user's top artists
  async getUserTopArtists(userId, limit = 5) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT ar.name as artist_name, up.preference_score, up.play_count
        FROM user_preferences up
        JOIN artists ar ON up.artist_id = ar.id
        WHERE up.user_id = $1 AND up.artist_id IS NOT NULL
        ORDER BY up.preference_score DESC, up.play_count DESC 
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = new RecommendationService(); 