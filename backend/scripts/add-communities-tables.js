const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tunetide',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function addCommunitiesTables() {
  const client = await pool.connect();
  
  try {
    console.log('Adding communities tables...');

    // Create communities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        genre VARCHAR(100),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_public BOOLEAN DEFAULT TRUE,
        member_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created communities table');

    // Create community_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_members (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(community_id, user_id)
      );
    `);
    console.log('✓ Created community_members table');

    // Create community_posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
        post_type VARCHAR(50) DEFAULT 'discussion',
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created community_posts table');

    // Create community_post_likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );
    `);
    console.log('✓ Created community_post_likes table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
      CREATE INDEX IF NOT EXISTS idx_communities_genre ON communities(genre);
      CREATE INDEX IF NOT EXISTS idx_communities_is_public ON communities(is_public);
      CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
      CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_community_id ON community_posts(community_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_post_type ON community_posts(post_type);
      CREATE INDEX IF NOT EXISTS idx_community_post_likes_post_id ON community_post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_community_post_likes_user_id ON community_post_likes(user_id);
    `);
    console.log('✓ Created indexes');

    // Create updated_at trigger function if it doesn't exist
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      console.log('✓ Created/updated trigger function');

      // Create triggers
      await client.query(`
        DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
        CREATE TRIGGER update_communities_updated_at 
          BEFORE UPDATE ON communities 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        DROP TRIGGER IF EXISTS update_community_posts_updated_at ON community_posts;
        CREATE TRIGGER update_community_posts_updated_at 
          BEFORE UPDATE ON community_posts 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✓ Created triggers');
    } catch (error) {
      console.log('⚠ Warning: Could not create triggers (permission issue), but tables were created successfully');
      console.log('   The communities feature will work, but updated_at timestamps won\'t auto-update');
    }

    console.log('\n🎉 Communities tables added successfully!');
    console.log('\nTables created:');
    console.log('- communities');
    console.log('- community_members');
    console.log('- community_posts');
    console.log('- community_post_likes');

  } catch (error) {
    console.error('Error adding communities tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addCommunitiesTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 