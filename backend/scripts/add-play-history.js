const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'tune-tide-postgres',
  port: 5432,
  database: process.env.DB_NAME || 'tunetide',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function addPlayHistoryTable() {
  try {
    console.log('Creating play_history table...');
    
    // Create play_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS play_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC)
    `);

    console.log('✅ Play history table created successfully!');
  } catch (error) {
    console.error('❌ Error creating play history table:', error);
  } finally {
    await pool.end();
  }
}

addPlayHistoryTable(); 