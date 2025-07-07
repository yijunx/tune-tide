const { Pool } = require('pg');
const vectorSearchService = require('../src/services/vectorSearchService');
require('dotenv').config();

async function generateSongDescriptions() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'tune-tide-postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'local-db',
    user: 'postgres',
    password: 'postgres',
    options: process.env.DB_OPTIONS || '-c search_path=myschema',
  });

  try {
    console.log('Starting to generate descriptions and index songs...');
    
    // Get all songs that don't have descriptions
    const result = await pool.query(`
      SELECT s.*, a.name as artist_name, al.title as album_title 
      FROM songs s 
      JOIN artists a ON s.artist_id = a.id 
      LEFT JOIN albums al ON s.album_id = al.id 
      WHERE s.description IS NULL OR s.description = ''
    `);

    const songs = result.rows;
    console.log(`Found ${songs.length} songs without descriptions`);

    if (songs.length === 0) {
      console.log('All songs already have descriptions!');
      await pool.end();
      return;
    }

    // Process songs in batches to avoid overwhelming the APIs
    const batchSize = 5;
    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = songs.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(songs.length / batchSize)}`);
      
      await Promise.all(batch.map(async (song) => {
        try {
          await vectorSearchService.indexSong(song);
        } catch (error) {
          console.error(`Error processing song ${song.title}:`, error.message);
        }
      }));

      // Wait between batches to be respectful to the APIs
      if (i + batchSize < songs.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('✓ Finished generating descriptions and indexing songs');
    await pool.end();
    
  } catch (error) {
    console.error('Error generating song descriptions:', error);
    await pool.end();
    process.exit(1);
  }
}

generateSongDescriptions(); 