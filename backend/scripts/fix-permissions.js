const { Pool } = require('pg');
require('dotenv').config();

async function fixPermissions() {
  // Connect as superuser to fix permissions
  const superPool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres', // Use postgres superuser
    password: 'postgres',
  });

  const appUser = process.env.DB_USER || 'local-user';
  const schema = 'myschema';

  try {
    console.log('Fixing database permissions...');

    // Grant schema usage and create permissions
    await superPool.query(`GRANT USAGE ON SCHEMA ${schema} TO "${appUser}"`);
    await superPool.query(`GRANT CREATE ON SCHEMA ${schema} TO "${appUser}"`);
    
    // Grant permissions on all tables in the schema
    const tables = [
      'users', 'artists', 'albums', 'songs', 'playlists', 'playlist_songs'
    ];

    for (const table of tables) {
      try {
        await superPool.query(`GRANT ALL PRIVILEGES ON TABLE ${schema}.${table} TO "${appUser}"`);
        await superPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schema} TO "${appUser}"`);
        console.log(`Granted permissions on ${table}`);
      } catch (error) {
        console.log(`Table ${table} might not exist yet: ${error.message}`);
      }
    }

    // Grant permissions on future tables
    await superPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT ALL ON TABLES TO "${appUser}"`);
    await superPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT ALL ON SEQUENCES TO "${appUser}"`);

    console.log('Database permissions fixed successfully!');
    await superPool.end();

  } catch (error) {
    console.error('Error fixing permissions:', error);
    await superPool.end();
    process.exit(1);
  }
}

fixPermissions(); 