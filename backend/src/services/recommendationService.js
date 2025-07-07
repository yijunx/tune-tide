const pool = require('../config/database');

class RecommendationService {
  // Update user preferences when a song is played
  async updateUserPreferences(userId, songId) {
    const client = await pool.connect();
    try {
      // Get song details
      const songResult = await client.query(`
        SELECT s.*, ar.name as artist_name, ar.id as artist_id, s.genre
        FROM songs s 
        JOIN artists ar ON s.artist_id = ar.id 
        WHERE s.id = $1
      `, [songId]);

      if (songResult.rows.length === 0) return;

      const song = songResult.rows[0];

      // Update artist preference
      await client.query(`
        INSERT INTO user_preferences (user_id, artist_id, preference_score, play_count, last_played)
        VALUES ($1, $2, 0.1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, artist_id, genre)
        DO UPDATE SET 
          preference_score = LEAST(user_preferences.preference_score + 0.1, 1.0),
          play_count = user_preferences.play_count + 1,
          last_played = CURRENT_TIMESTAMP
        WHERE user_preferences.user_id = $1 AND user_preferences.artist_id = $2 AND user_preferences.genre IS NULL
      `, [userId, song.artist_id]);

      // Update genre preference if genre exists
      if (song.genre) {
        await client.query(`
          INSERT INTO user_preferences (user_id, genre, preference_score, play_count, last_played)
          VALUES ($1, $2, 0.1, 1, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, artist_id, genre)
          DO UPDATE SET 
            preference_score = LEAST(user_preferences.preference_score + 0.1, 1.0),
            play_count = user_preferences.play_count + 1,
            last_played = CURRENT_TIMESTAMP
          WHERE user_preferences.user_id = $1 AND user_preferences.genre = $2 AND user_preferences.artist_id IS NULL
        `, [userId, song.genre]);
      }

      // Clear old recommendations and generate new ones
      await this.generateRecommendations(userId);

    } finally {
      client.release();
    }
  }

  // Generate recommendations for a user
  async generateRecommendations(userId) {
    const client = await pool.connect();
    try {
      // Clear old recommendations
      await client.query('DELETE FROM recommendation_cache WHERE user_id = $1', [userId]);

      // Get user's top preferences
      const preferencesResult = await client.query(`
        SELECT artist_id, genre, preference_score, play_count
        FROM user_preferences 
        WHERE user_id = $1 
        ORDER BY preference_score DESC, play_count DESC 
        LIMIT 10
      `, [userId]);

      if (preferencesResult.rows.length === 0) {
        // No preferences yet, recommend popular songs
        await this.recommendPopularSongs(userId);
        return;
      }

      const recommendations = [];

      // Generate recommendations based on preferences
      for (const pref of preferencesResult.rows) {
        if (pref.artist_id) {
          // Recommend songs from favorite artists
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

          genreSongs.rows.forEach(song => {
            recommendations.push({
              song_id: song.id,
              score: pref.preference_score * 0.6,
              reason: `Based on your love for ${pref.genre} music`
            });
          });
        }
      }

      // Remove duplicates and sort by score
      const uniqueRecommendations = recommendations.reduce((acc, rec) => {
        if (!acc.find(r => r.song_id === rec.song_id)) {
          acc.push(rec);
        }
        return acc;
      }, []).sort((a, b) => b.score - a.score);

      // Store top 20 recommendations
      const topRecommendations = uniqueRecommendations.slice(0, 20);
      
      for (const rec of topRecommendations) {
        await client.query(`
          INSERT INTO recommendation_cache (user_id, song_id, score, reason)
          VALUES ($1, $2, $3, $4)
        `, [userId, rec.song_id, rec.score, rec.reason]);
      }

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