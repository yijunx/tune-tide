const { Pool } = require('pg');
require('dotenv').config();

async function addCommentsTable() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Adding song comments table...');
    
    // Create song_comments table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS song_comments (
          id SERIAL PRIMARY KEY,
          song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ song_comments table created successfully');
    } catch (error) {
      console.error('Error creating song_comments table:', error.message);
    }
    
    // Create indexes for better performance
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_song_comments_song_id ON song_comments(song_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_song_comments_user_id ON song_comments(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_song_comments_created_at ON song_comments(created_at DESC)');
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
    
    // Create trigger for updated_at
    try {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_song_comments_updated_at ON song_comments;
        CREATE TRIGGER update_song_comments_updated_at 
        BEFORE UPDATE ON song_comments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      console.log('✓ Trigger created successfully');
    } catch (error) {
      console.error('Error creating trigger:', error.message);
    }
    
    console.log('Database schema updated successfully!');
    await pool.end();
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    await pool.end();
    process.exit(1);
  }
}

addCommentsTable(); 