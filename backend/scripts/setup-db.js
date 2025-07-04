const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  // Connect to default postgres database first
  const defaultPool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('Connecting to PostgreSQL...');
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'local-db';
    const checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = $1";
    const dbExists = await defaultPool.query(checkDbQuery, [dbName]);
    
    if (dbExists.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await defaultPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
    
    await defaultPool.end();
    
    // Connect to the new database and run schema
    const pool = new Pool({
      host: process.env.DB_HOST || 'tune-tide-postgres',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      options: process.env.DB_OPTIONS || '-c search_path=myschema',
    });

    console.log('Running schema...');
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute schema statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error('Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('Database setup completed successfully!');
    await pool.end();
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 