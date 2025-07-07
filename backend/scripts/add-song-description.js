const { Pool } = require('pg');
require('dotenv').config();

async function addSongDescription() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Adding description column to songs table...');
    
    // Add description column if it doesn't exist
    try {
      await pool.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS description TEXT');
      console.log('✓ Description column added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Description column already exists in songs table');
      } else {
        console.error('Error adding description column:', error.message);
        throw error;
      }
    }
    
    // Create index for description search
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_songs_description ON songs USING gin(to_tsvector(\'english\', description))');
      console.log('✓ Description index created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Description index already exists');
      } else {
        console.error('Error creating description index:', error.message);
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

addSongDescription(); 