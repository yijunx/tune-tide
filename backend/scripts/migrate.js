const { Pool } = require('pg');
require('dotenv').config();

async function migrateDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Running database migrations...');

    // Add created_by column to songs table if it doesn't exist
    try {
      await pool.query('ALTER TABLE songs ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
      console.log('Added created_by column to songs table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('created_by column already exists in songs table');
      } else {
        console.error('Error adding created_by to songs:', error.message);
      }
    }

    // Add created_by column to playlists table if it doesn't exist
    try {
      await pool.query('ALTER TABLE playlists ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
      console.log('Added created_by column to playlists table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('created_by column already exists in playlists table');
      } else {
        console.error('Error adding created_by to playlists:', error.message);
      }
    }

    // Create indexes if they don't exist
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_songs_created_by ON songs(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON playlists(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        console.error('Error creating index:', error.message);
      }
    }

    console.log('Database migrations completed successfully!');
    await pool.end();
    
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrateDatabase(); 