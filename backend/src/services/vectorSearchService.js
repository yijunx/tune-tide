const weaviate = require('weaviate-ts-client').default;
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Initialize Weaviate client
const client = weaviate.client({
  scheme: 'http',
  host: 'tune-tide-weaviate:8080',
});

// Initialize vLLM Llama3 client for both text generation and embeddings
const VLLM_BASE_URL = 'http://10.2.4.155:80';
const EMBEDDING_MODEL = 'BAAI/bge-m3';

class VectorSearchService {
  constructor() {
    this.initializeWeaviate();
  }

  async initializeWeaviate() {
    try {
      // Check if Weaviate is available
      await client.misc.metaGetter().do();
      console.log('✓ Connected to Weaviate');
      
      // Create schema if it doesn't exist
      await this.createSchema();
    } catch (error) {
      console.error('Error connecting to Weaviate:', error.message);
    }
  }

  async createSchema() {
    try {
      // Check if SongV2 class exists
      const schema = await client.schema.getter().do();
      const songClassExists = schema.classes.some(cls => cls.class === 'SongV2');
      
      if (songClassExists) {
        console.log('✓ SongV2 class already exists in Weaviate');
        return;
      }
      
      // Create SongV2 class schema for BGE-M3 (1024 dimensions)
      const songClass = {
        class: 'SongV2',
        description: 'A song with vector embeddings for semantic search using BGE-M3',
        properties: [
          {
            name: 'songId',
            dataType: ['int'],
            description: 'The ID of the song in the main database'
          },
          {
            name: 'title',
            dataType: ['text'],
            description: 'The title of the song'
          },
          {
            name: 'artistName',
            dataType: ['text'],
            description: 'The name of the artist'
          },
          {
            name: 'albumTitle',
            dataType: ['text'],
            description: 'The title of the album'
          },
          {
            name: 'genre',
            dataType: ['text'],
            description: 'The genre of the song'
          },
          {
            name: 'description',
            dataType: ['text'],
            description: 'The description of the song for semantic search'
          }
        ],
        // Remove vectorizer to use manual vectors
        vectorizer: 'none',
        // Set vector index config for BGE-M3 dimensions
        vectorIndexConfig: {
          vectorCacheMaxObjects: 100000,
          distance: 'cosine'
        }
      };

      await client.schema.classCreator().withClass(songClass).do();
      console.log('✓ Created SongV2 class in Weaviate with BGE-M3 dimensions');
    } catch (error) {
      console.error('Error creating Weaviate schema:', error.message);
    }
  }

  async generateEmbedding(text) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch(`${VLLM_BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes("does not support Embeddings API")) {
          console.log('vLLM model does not support embeddings, using fallback method');
          return this.generateFallbackEmbedding(text);
        }
        throw new Error(`vLLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      // Log the full response for debugging
      if (!data || !data.data || !Array.isArray(data.data) || !data.data[0] || !data.data[0].embedding) {
        console.error('Unexpected embedding API response:', JSON.stringify(data));
        throw new Error('Invalid embedding API response structure');
      }
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      if (error.name === 'AbortError') {
        console.error('vLLM API request timed out');
      }
      // Return a simple fallback embedding
      return this.generateFallbackEmbedding(text);
    }
  }

  generateFallbackEmbedding(text) {
    // Simple hash-based embedding as fallback
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(text.toLowerCase()).digest('hex');
    
    // Convert hash to array of numbers (0-1 range) - BGE-M3 uses 1024 dimensions
    const embedding = [];
    for (let i = 0; i < 1024; i++) {
      const hashIndex = i % hash.length;
      const charCode = hash.charCodeAt(hashIndex);
      embedding.push((charCode / 255) * 2 - 1); // Convert to -1 to 1 range
    }
    
    return embedding;
  }

  async generateSongDescription(song) {
    try {
      const prompt = `Generate a natural language description for this song that captures its mood, energy, and style. 
      Song: "${song.title}" by ${song.artist_name}
      Album: ${song.album_title || 'Unknown Album'}
      Genre: ${song.genre || 'Unknown Genre'}
      
      Write a description that would help someone find this song when searching with natural language queries like "I'm feeling sad" or "need a party song". 
      Focus on the emotional tone, energy level, and style of the music.`;

      const response = await fetch(`http://10.2.4.153:80/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'ibnzterrell/Meta-Llama-3.3-70B-Instruct-AWQ-INT4',
          prompt: prompt,
          max_tokens: 100,
          temperature: 0.7,
          stop: ['\n\n', '.', '!', '?']
        })
      });

      if (!response.ok) {
        throw new Error(`vLLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating song description:', error);
      // Fallback description
      return `A ${song.genre || 'music'} song by ${song.artist_name}`;
    }
  }

  async indexSong(song) {
    try {
      // Generate description if not exists
      let description = song.description;
      if (!description) {
        description = await this.generateSongDescription(song);
        // Update the song in the database with the generated description
        await pool.query(
          'UPDATE songs SET description = $1 WHERE id = $2',
          [description, song.id]
        );
      }

      // Generate embedding for the song
      const songText = `${song.title} ${song.artist_name} ${song.album_title || ''} ${song.genre || ''} ${description}`;
      const embedding = await this.generateEmbedding(songText);

      // Generate UUID for Weaviate
      const songUuid = uuidv4();

      // Check if song already exists in Weaviate by songId using GraphQL
      let existingSong = null;
      try {
        const result = await client.graphql.get()
          .withClassName('SongV2')
          .withFields('songId _additional { id }')
          .withWhere({
            path: ['songId'],
            operator: 'Equal',
            valueInt: song.id
          })
          .withLimit(1)
          .do();
        if (result.data.Get && result.data.Get.SongV2 && result.data.Get.SongV2.length > 0) {
          existingSong = result.data.Get.SongV2[0];
        }
      } catch (weaviateError) {
        console.error('Error querying Weaviate for existing song:', weaviateError.message);
      }

      try {
        if (existingSong) {
          // Update existing song
          await client.data.updater()
            .withClassName('SongV2')
            .withId(existingSong._additional.id)
            .withProperties({
              songId: song.id,
              title: song.title,
              artistName: song.artist_name,
              albumTitle: song.album_title || '',
              genre: song.genre || '',
              description: description
            })
            .withVector(embedding)
            .do();
        } else {
          // Create new song
          await client.data.creator()
            .withClassName('SongV2')
            .withId(songUuid)
            .withProperties({
              songId: song.id,
              title: song.title,
              artistName: song.artist_name,
              albumTitle: song.album_title || '',
              genre: song.genre || '',
              description: description
            })
            .withVector(embedding)
            .do();
        }
        console.log(`✓ Indexed song: ${song.title}`);
      } catch (weaviateError) {
        console.error(`Weaviate error for song ${song.title}:`, weaviateError.message);
        // Continue without failing the entire process
      }
    } catch (error) {
      console.error(`Error indexing song ${song.title}:`, error);
    }
  }

  async searchSongsByNaturalLanguage(query, limit = 10) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in Weaviate
      const result = await client.graphql
        .get()
        .withClassName('SongV2')
        .withFields('songId title artistName albumTitle genre description _additional { distance }')
        .withNearVector({
          vector: queryEmbedding
        })
        .withLimit(limit)
        .do();

      const songs = result.data.Get.SongV2;
      
      if (songs.length === 0) {
        // Fallback to text search if no vector results
        return this.fallbackTextSearch(query, limit);
      }
      
      // Get full song details from database
      const songIds = songs.map(s => s.songId);
      const songDetails = await pool.query(
        `SELECT s.id, s.title, s.artist_id, s.album_id, s.audio_url, al.artwork_url, s.duration, s.genre, s.description, a.name as artist_name, al.title as album_title 
         FROM songs s 
         JOIN artists a ON s.artist_id = a.id 
         LEFT JOIN albums al ON s.album_id = al.id 
         WHERE s.id = ANY($1)
         ORDER BY array_position($1, s.id)`,
        [songIds]
      );

      return songDetails.rows;
    } catch (error) {
      console.error('Error searching songs by natural language:', error);
      
      // Fallback to text search
      return this.fallbackTextSearch(query, limit);
    }
  }

  async fallbackTextSearch(query, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT s.id, s.title, s.artist_id, s.album_id, s.audio_url, al.artwork_url, s.duration, s.genre, s.description, a.name as artist_name, al.title as album_title 
         FROM songs s 
         JOIN artists a ON s.artist_id = a.id 
         LEFT JOIN albums al ON s.album_id = al.id 
         WHERE to_tsvector('english', s.title || ' ' || a.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')) @@ plainto_tsquery('english', $1)
         ORDER BY ts_rank(to_tsvector('english', s.title || ' ' || a.name || ' ' || COALESCE(al.title, '') || ' ' || COALESCE(s.genre, '') || ' ' || COALESCE(s.description, '')), plainto_tsquery('english', $1)) DESC
         LIMIT $2`,
        [query, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error in fallback text search:', error);
      return [];
    }
  }

  async indexAllSongs() {
    try {
      console.log('Starting to index all songs...');
      
      const result = await pool.query(
        `SELECT s.id, s.title, s.artist_id, s.album_id, s.audio_url, al.artwork_url, s.duration, s.genre, s.description, a.name as artist_name, al.title as album_title 
         FROM songs s 
         JOIN artists a ON s.artist_id = a.id 
         LEFT JOIN albums al ON s.album_id = al.id`
      );

      const songs = result.rows;
      console.log(`Found ${songs.length} songs to index`);

      for (const song of songs) {
        await this.indexSong(song);
        // Small delay to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✓ Finished indexing all songs');
    } catch (error) {
      console.error('Error indexing all songs:', error);
    }
  }

  async updateSongDescription(songId) {
    try {
      const result = await pool.query(
        `SELECT s.*, a.name as artist_name, al.title as album_title 
         FROM songs s 
         JOIN artists a ON s.artist_id = a.id 
         LEFT JOIN albums al ON s.album_id = al.id 
         WHERE s.id = $1`,
        [songId]
      );

      if (result.rows.length > 0) {
        const song = result.rows[0];
        await this.indexSong(song);
      }
    } catch (error) {
      console.error(`Error updating song description for ID ${songId}:`, error);
    }
  }
}

module.exports = new VectorSearchService();