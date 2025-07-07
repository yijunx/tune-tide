"use client";
import { useState, useEffect } from "react";
import { Plus, Users, Music, MessageCircle, Heart, HeartOff, Play, Search, Filter } from "lucide-react";
import { communitiesApi, Community, CommunityPost, songsApi, Song } from "@/services/api";

interface CommunitiesProps {
  user: any;
  onPlaySong: (song: Song) => void;
}

export default function Communities({ user, onPlaySong }: CommunitiesProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'my' | 'recommended'>('discover');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    genre: '',
    isPublic: true
  });

  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    songId: '',
    postType: 'discussion'
  });

  const genres = [
    'Rock', 'Pop', 'Hip Hop', 'Jazz', 'Classical', 'Electronic', 
    'Country', 'R&B', 'Folk', 'Blues', 'Metal', 'Punk', 'Indie'
  ];

  // Load communities based on active tab
  useEffect(() => {
    if (user) {
      loadCommunities();
    }
  }, [activeTab, user]);

  // Load posts when community is selected
  useEffect(() => {
    if (selectedCommunity) {
      loadPosts();
    }
  }, [selectedCommunity]);

  // Load available songs for post creation
  useEffect(() => {
    if (showPostForm) {
      loadAvailableSongs();
    }
  }, [showPostForm]);

  const loadCommunities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 'discover':
          const publicCommunities = await communitiesApi.getPublic();
          setCommunities(publicCommunities);
          break;
        case 'my':
          const userCommunities = await communitiesApi.getMyCommunities();
          setMyCommunities(userCommunities);
          break;
        case 'recommended':
          const recommended = await communitiesApi.getRecommended();
          setRecommendedCommunities(recommended);
          break;
      }
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!selectedCommunity) return;
    
    setPostsLoading(true);
    try {
      const communityPosts = await communitiesApi.getPosts(selectedCommunity.id);
      setPosts(communityPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadAvailableSongs = async () => {
    try {
      const songsResponse = await songsApi.getAll(1, 100);
      setAvailableSongs(songsResponse.songs);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const handleCreateCommunity = async () => {
    if (!createForm.name || !createForm.description) return;
    
    try {
      const newCommunity = await communitiesApi.create(createForm);
      setMyCommunities(prev => [newCommunity, ...prev]);
      setShowCreateForm(false);
      setCreateForm({ name: '', description: '', genre: '', isPublic: true });
      setActiveTab('my');
    } catch (error) {
      console.error('Error creating community:', error);
      alert('Failed to create community');
    }
  };

  const handleJoinCommunity = async (community: Community) => {
    try {
      await communitiesApi.join(community.id);
      setMyCommunities(prev => [community, ...prev]);
      alert('Successfully joined community!');
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Failed to join community');
    }
  };

  const handleLeaveCommunity = async (community: Community) => {
    if (!confirm('Are you sure you want to leave this community?')) return;
    
    try {
      await communitiesApi.leave(community.id);
      setMyCommunities(prev => prev.filter(c => c.id !== community.id));
      if (selectedCommunity?.id === community.id) {
        setSelectedCommunity(null);
        setPosts([]);
      }
      alert('Successfully left community');
    } catch (error) {
      console.error('Error leaving community:', error);
      alert('Failed to leave community');
    }
  };

  const handleCreatePost = async () => {
    if (!selectedCommunity || !postForm.title || !postForm.content) return;
    
    try {
      const newPost = await communitiesApi.createPost(selectedCommunity.id, {
        title: postForm.title,
        content: postForm.content,
        songId: postForm.songId ? parseInt(postForm.songId) : undefined,
        postType: postForm.postType
      });
      setPosts(prev => [newPost, ...prev]);
      setShowPostForm(false);
      setPostForm({ title: '', content: '', songId: '', postType: 'discussion' });
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  };

  const handleToggleLike = async (post: CommunityPost) => {
    try {
      const result = await communitiesApi.togglePostLike(post.id);
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, likes_count: result.liked ? p.likes_count + 1 : p.likes_count - 1, user_liked: result.liked }
          : p
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handlePlaySongFromPost = (post: CommunityPost) => {
    if (post.song_id && post.song_title && post.artist_name && post.audio_url) {
      const song: Song = {
        id: post.song_id,
        title: post.song_title,
        artist_name: post.artist_name,
        audio_url: post.audio_url,
        artwork_url: post.artwork_url,
        artist_id: 0, // We don't have this in the post
        album_title: '',
        duration: 0,
        genre: ''
      };
      onPlaySong(song);
    }
  };

  const getCurrentCommunities = () => {
    switch (activeTab) {
      case 'discover': return communities;
      case 'my': return myCommunities;
      case 'recommended': return recommendedCommunities;
      default: return [];
    }
  };

  const filteredCommunities = getCurrentCommunities().filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || community.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please log in to access communities
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Communities</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          Create Community
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'discover'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'my'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          My Communities
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'recommended'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Recommended
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      {/* Communities List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="text-gray-600 dark:text-gray-400">Loading communities...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCommunities.map(community => (
            <div
              key={community.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedCommunity?.id === community.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedCommunity(community)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{community.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{community.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {community.member_count} members
                    </span>
                    {community.genre && (
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {community.genre}
                      </span>
                    )}
                    {community.creator_name && (
                      <span>by {community.creator_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === 'my' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveCommunity(community);
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Leave
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinCommunity(community);
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Community Posts */}
      {selectedCommunity && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedCommunity.name} - Posts
            </h3>
            <button
              onClick={() => setShowPostForm(true)}
              className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
            >
              <Plus size={14} />
              New Post
            </button>
          </div>

          {postsLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-gray-600 dark:text-gray-400">Loading posts...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    {post.author_picture && (
                      <img
                        src={post.author_picture}
                        alt={post.author_name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{post.title}</h4>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {post.post_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{post.content}</p>
                      
                      {/* Song attachment */}
                      {post.song_title && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                          {post.artwork_url && (
                            <img
                              src={post.artwork_url}
                              alt={post.song_title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{post.song_title}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{post.artist_name}</div>
                          </div>
                          <button
                            onClick={() => handlePlaySongFromPost(post)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                          >
                            <Play size={16} className="ml-0.5" />
                          </button>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>by {post.author_name} • {new Date(post.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleToggleLike(post)}
                            className={`flex items-center gap-1 transition-colors ${
                              post.user_liked 
                                ? 'text-red-500 dark:text-red-400' 
                                : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                            }`}
                          >
                            {post.user_liked ? <Heart size={14} /> : <HeartOff size={14} />}
                            {post.likes_count}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Community</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Community name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24"
              />
              <select
                value={createForm.genre}
                onChange={(e) => setCreateForm(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Genre (Optional)</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.isPublic}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Public community</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateCommunity}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showPostForm && selectedCommunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Post</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Post title"
                value={postForm.title}
                onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Post content"
                value={postForm.content}
                onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24"
              />
              <select
                value={postForm.postType}
                onChange={(e) => setPostForm(prev => ({ ...prev, postType: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="discussion">Discussion</option>
                <option value="music_share">Music Share</option>
                <option value="announcement">Announcement</option>
              </select>
              {postForm.postType === 'music_share' && (
                <select
                  value={postForm.songId}
                  onChange={(e) => setPostForm(prev => ({ ...prev, songId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a song (Optional)</option>
                  {availableSongs.map(song => (
                    <option key={song.id} value={song.id}>{song.title} - {song.artist_name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreatePost}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
              >
                Post
              </button>
              <button
                onClick={() => setShowPostForm(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 