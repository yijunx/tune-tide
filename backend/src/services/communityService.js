const pool = require('../config/database');

class CommunityService {
  // Create a new community
  async createCommunity(communityData, creatorId) {
    const client = await pool.connect();
    try {
      const { name, description, genre, isPublic = true } = communityData;
      
      const result = await client.query(`
        INSERT INTO communities (name, description, genre, created_by, is_public)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, description, genre, creatorId, isPublic]);

      const community = result.rows[0];

      // Add creator as admin
      await client.query(`
        INSERT INTO community_members (community_id, user_id, role)
        VALUES ($1, $2, 'admin')
      `, [community.id, creatorId]);

      // Update member count
      await client.query(`
        UPDATE communities 
        SET member_count = 1 
        WHERE id = $1
      `, [community.id]);

      return community;
    } finally {
      client.release();
    }
  }

  // Get all public communities
  async getPublicCommunities(limit = 20, offset = 0) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT c.*, u.name as creator_name,
               COUNT(cm.user_id) as member_count
        FROM communities c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN community_members cm ON c.id = cm.community_id
        WHERE c.is_public = true
        GROUP BY c.id, u.name
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get communities by genre
  async getCommunitiesByGenre(genre, limit = 20, offset = 0) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT c.*, u.name as creator_name,
               COUNT(cm.user_id) as member_count
        FROM communities c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN community_members cm ON c.id = cm.community_id
        WHERE c.genre = $1 AND c.is_public = true
        GROUP BY c.id, u.name
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      `, [genre, limit, offset]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get user's communities
  async getUserCommunities(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT c.*, u.name as creator_name, cm.role,
               COUNT(cmm.user_id) as member_count
        FROM communities c
        JOIN community_members cm ON c.id = cm.community_id
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN community_members cmm ON c.id = cmm.community_id
        WHERE cm.user_id = $1
        GROUP BY c.id, u.name, cm.role
        ORDER BY c.created_at DESC
      `, [userId]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get community details
  async getCommunityById(communityId, userId = null) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT c.*, u.name as creator_name,
               COUNT(cm.user_id) as member_count,
               CASE WHEN cm.user_id IS NOT NULL THEN cm.role ELSE NULL END as user_role
        FROM communities c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN community_members cm ON c.id = cm.community_id
        LEFT JOIN community_members cm_user ON c.id = cm_user.community_id AND cm_user.user_id = $2
        WHERE c.id = $1
        GROUP BY c.id, u.name, cm_user.role
      `, [communityId, userId]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Join a community
  async joinCommunity(communityId, userId) {
    const client = await pool.connect();
    try {
      // Check if user is already a member
      const existingMember = await client.query(`
        SELECT id FROM community_members 
        WHERE community_id = $1 AND user_id = $2
      `, [communityId, userId]);

      if (existingMember.rows.length > 0) {
        throw new Error('User is already a member of this community');
      }

      // Add user to community
      await client.query(`
        INSERT INTO community_members (community_id, user_id)
        VALUES ($1, $2)
      `, [communityId, userId]);

      // Update member count
      await client.query(`
        UPDATE communities 
        SET member_count = member_count + 1 
        WHERE id = $1
      `, [communityId]);

      return { success: true };
    } finally {
      client.release();
    }
  }

  // Leave a community
  async leaveCommunity(communityId, userId) {
    const client = await pool.connect();
    try {
      // Check if user is the creator
      const community = await client.query(`
        SELECT created_by FROM communities WHERE id = $1
      `, [communityId]);

      if (community.rows[0]?.created_by === userId) {
        throw new Error('Community creator cannot leave the community');
      }

      // Remove user from community
      const result = await client.query(`
        DELETE FROM community_members 
        WHERE community_id = $1 AND user_id = $2
      `, [communityId, userId]);

      if (result.rowCount > 0) {
        // Update member count
        await client.query(`
          UPDATE communities 
          SET member_count = member_count - 1 
          WHERE id = $1
        `, [communityId]);
      }

      return { success: true };
    } finally {
      client.release();
    }
  }

  // Create a post in a community
  async createPost(postData, userId) {
    const client = await pool.connect();
    try {
      const { communityId, title, content, songId, postType = 'discussion' } = postData;

      // Check if user is a member of the community
      const memberCheck = await client.query(`
        SELECT id FROM community_members 
        WHERE community_id = $1 AND user_id = $2
      `, [communityId, userId]);

      if (memberCheck.rows.length === 0) {
        throw new Error('You must be a member of this community to post');
      }

      const result = await client.query(`
        INSERT INTO community_posts (community_id, user_id, title, content, song_id, post_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [communityId, userId, title, content, songId, postType]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get posts from a community
  async getCommunityPosts(communityId, limit = 20, offset = 0) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT cp.*, u.name as author_name, u.picture_url as author_picture,
               s.title as song_title, s.artist_id, ar.name as artist_name,
               s.artwork_url, s.audio_url,
               COUNT(cpl.id) as likes_count,
               EXISTS(SELECT 1 FROM community_post_likes WHERE post_id = cp.id AND user_id = $3) as user_liked
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN songs s ON cp.song_id = s.id
        LEFT JOIN artists ar ON s.artist_id = ar.id
        LEFT JOIN community_post_likes cpl ON cp.id = cpl.post_id
        WHERE cp.community_id = $1
        GROUP BY cp.id, u.name, u.picture_url, s.title, s.artist_id, ar.name, s.artwork_url, s.audio_url
        ORDER BY cp.created_at DESC
        LIMIT $2 OFFSET $4
      `, [communityId, limit, null, offset]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Like/unlike a post
  async togglePostLike(postId, userId) {
    const client = await pool.connect();
    try {
      // Check if user already liked the post
      const existingLike = await client.query(`
        SELECT id FROM community_post_likes 
        WHERE post_id = $1 AND user_id = $2
      `, [postId, userId]);

      if (existingLike.rows.length > 0) {
        // Unlike
        await client.query(`
          DELETE FROM community_post_likes 
          WHERE post_id = $1 AND user_id = $2
        `, [postId, userId]);

        await client.query(`
          UPDATE community_posts 
          SET likes_count = likes_count - 1 
          WHERE id = $1
        `, [postId]);

        return { liked: false };
      } else {
        // Like
        await client.query(`
          INSERT INTO community_post_likes (post_id, user_id)
          VALUES ($1, $2)
        `, [postId, userId]);

        await client.query(`
          UPDATE community_posts 
          SET likes_count = likes_count + 1 
          WHERE id = $1
        `, [postId]);

        return { liked: true };
      }
    } finally {
      client.release();
    }
  }

  // Get recommended communities based on user preferences
  async getRecommendedCommunities(userId, limit = 10) {
    const client = await pool.connect();
    try {
      // Get user's top genres
      const userGenres = await client.query(`
        SELECT genre FROM user_preferences 
        WHERE user_id = $1 AND genre IS NOT NULL
        ORDER BY preference_score DESC 
        LIMIT 3
      `, [userId]);

      if (userGenres.rows.length === 0) {
        // If no preferences, return popular communities
        return await this.getPublicCommunities(limit);
      }

      const genres = userGenres.rows.map(row => row.genre);
      
      const result = await client.query(`
        SELECT c.*, u.name as creator_name,
               COUNT(cm.user_id) as member_count
        FROM communities c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN community_members cm ON c.id = cm.community_id
        WHERE c.genre = ANY($1) AND c.is_public = true
        GROUP BY c.id, u.name
        ORDER BY c.member_count DESC, c.created_at DESC
        LIMIT $2
      `, [genres, limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = new CommunityService(); 