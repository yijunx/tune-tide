const { Pool } = require('pg');
require('dotenv').config();

async function addRecommendationTables() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Adding recommendation tables...');
    
    // Create user_preferences table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
          genre VARCHAR(100),
          preference_score DECIMAL(3,2) DEFAULT 0.0,
          play_count INTEGER DEFAULT 0,
          last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, artist_id, genre),
          CONSTRAINT check_artist_or_genre CHECK (
            (artist_id IS NOT NULL AND genre IS NULL) OR 
            (artist_id IS NULL AND genre IS NOT NULL)
          )
        )
      `);
      console.log('✓ user_preferences table created successfully');
    } catch (error) {
      console.error('Error creating user_preferences table:', error.message);
    }
    
    // Create recommendation_cache table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS recommendation_cache (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
          score DECIMAL(5,4) DEFAULT 0.0,
          reason VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, song_id)
        )
      `);
      console.log('✓ recommendation_cache table created successfully');
    } catch (error) {
      console.error('Error creating recommendation_cache table:', error.message);
    }
    
    // Create indexes for better performance
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_user_preferences_genre ON user_preferences(genre)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_user_preferences_artist_id ON user_preferences(artist_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendation_cache(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_recommendation_cache_score ON recommendation_cache(score DESC)');
      console.log('✓ Indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error.message);
    }
    
    // Create updated_at trigger function if it doesn't exist
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      console.log('✓ Updated trigger function created');
    } catch (error) {
      console.error('Error creating trigger function:', error.message);
    }
    
    // Create triggers for updated_at
    try {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
        CREATE TRIGGER update_user_preferences_updated_at 
        BEFORE UPDATE ON user_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      
      await pool.query(`
        DROP TRIGGER IF EXISTS update_recommendation_cache_updated_at ON recommendation_cache;
        CREATE TRIGGER update_recommendation_cache_updated_at 
        BEFORE UPDATE ON recommendation_cache 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      console.log('✓ Triggers created successfully');
    } catch (error) {
      console.error('Error creating triggers:', error.message);
    }
    
    console.log('Database schema updated successfully!');
    await pool.end();
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    await pool.end();
    process.exit(1);
  }
}

addRecommendationTables(); 