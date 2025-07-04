const { Pool } = require('pg');
require('dotenv').config();

async function addGenreColumn() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Adding genre column to songs table...');
    
    // Add genre column if it doesn't exist
    try {
      await pool.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre VARCHAR(100)');
      console.log('✓ Genre column added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Genre column already exists in songs table');
      } else {
        console.error('Error adding genre column:', error.message);
        throw error;
      }
    }
    
    // Create index for genre search
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre)');
      console.log('✓ Genre index created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Genre index already exists');
      } else {
        console.error('Error creating genre index:', error.message);
      }
    }
    
    console.log('Database schema updated successfully!');
    await pool.end();
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    await pool.end();
    process.exit(1);
  }
}

addGenreColumn(); 