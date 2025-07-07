const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Song {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  album_id?: number;
  album_title?: string;
  artwork_url?: string;
  duration?: number;
  audio_url: string;
  genre?: string;
  description?: string;
}

export interface Artist {
  id: number;
  name: string;
  bio?: string;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  release_year?: number;
  artwork_url?: string;
}

export interface Playlist {
  id: number;
  name: string;
  songs?: Song[];
}

export interface PlayHistory {
  id: number;
  played_at: string;
  song_id: number;
  title: string;
  duration?: number;
  audio_url: string;
  genre?: string;
  artist_id: number;
  artist_name: string;
  album_id?: number;
  album_title?: string;
  artwork_url?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  user_name: string;
  user_picture_url?: string;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: PaginationInfo;
}

export interface PaginatedResponse<T> {
  songs: T[];
  pagination: PaginationInfo;
  searchType?: 'text' | 'natural-language';
}

// Generic API call function
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
  }

  // Always start with our headers, then spread any additional headers from options (so Authorization is not overwritten)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers, // Our headers always take precedence
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Helper to get auth headers for fetch
function getAuthHeaders(): Record<string, string> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Songs API
export const songsApi = {
  getAll: (page = 1, limit = 20, search?: string, naturalLanguage?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    if (naturalLanguage) {
      params.append('naturalLanguage', 'true');
    }
    return apiCall<PaginatedResponse<Song>>(`/songs?${params.toString()}`);
  },
  getById: (id: number) => apiCall<Song>(`/songs/${id}`),
  search: (query: string) => apiCall<Song[]>(`/songs/search/${encodeURIComponent(query)}`),
  naturalSearch: (query: string, limit = 10) => apiCall<{ songs: Song[]; query: string; count: number; searchType: string }>(`/songs/natural-search/${encodeURIComponent(query)}?limit=${limit}`),
  getByArtist: (artistId: number) => apiCall<Song[]>(`/songs/artist/${artistId}`),
  getByAlbum: (albumId: number) => apiCall<Song[]>(`/songs/album/${albumId}`),
  create: (data: Partial<Song>) => apiCall<Song>('/songs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Song>) => apiCall<Song>(`/songs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall<{ message: string }>(`/songs/${id}`, {
    method: 'DELETE',
  }),
};

// Artists API
export const artistsApi = {
  getAll: () => apiCall<Artist[]>('/artists'),
  getById: (id: number) => apiCall<Artist>(`/artists/${id}`),
  search: (query: string) => apiCall<Artist[]>(`/artists/search/${encodeURIComponent(query)}`),
  create: (data: Partial<Artist>) => apiCall<Artist>('/artists', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Artist>) => apiCall<Artist>(`/artists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall<{ message: string }>(`/artists/${id}`, {
    method: 'DELETE',
  }),
};

// Albums API
export const albumsApi = {
  getAll: () => apiCall<Album[]>('/albums'),
  getById: (id: number) => apiCall<Album>(`/albums/${id}`),
  search: (query: string) => apiCall<Album[]>(`/albums/search/${encodeURIComponent(query)}`),
  getByArtist: (artistId: number) => apiCall<Album[]>(`/albums/artist/${artistId}`),
  create: (data: Partial<Album>) => apiCall<Album>('/albums', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Album>) => apiCall<Album>(`/albums/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall<{ message: string }>(`/albums/${id}`, {
    method: 'DELETE',
  }),
};

// Playlists API
export const playlistsApi = {
  getAll: () => apiCall<Playlist[]>('/playlists'),
  getById: (id: number) => apiCall<Playlist>(`/playlists/${id}`),
  create: (data: Partial<Playlist>) => apiCall<Playlist>('/playlists', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Playlist>) => apiCall<Playlist>(`/playlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiCall<{ message: string }>(`/playlists/${id}`, {
    method: 'DELETE',
  }),
  addSong: (playlistId: number, songId: number) => apiCall<any>(`/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: JSON.stringify({ song_id: songId }),
  }),
  removeSong: (playlistId: number, songId: number) => apiCall<{ message: string }>(`/playlists/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
  }),
};

// Play History API
export const playHistoryApi = {
  recordPlay: (songId: number) => apiCall<any>('/play-history', {
    method: 'POST',
    body: JSON.stringify({ song_id: songId }),
  }),
  getAll: (limit = 50, offset = 0) => apiCall<PlayHistory[]>(`/play-history?limit=${limit}&offset=${offset}`),
  getCount: () => apiCall<{ total: number }>('/play-history/count'),
  clear: () => apiCall<{ message: string }>('/play-history', {
    method: 'DELETE',
  }),
};

// Upload API
export const uploadApi = {
  uploadAlbumArtwork: async (file: File) => {
    const formData = new FormData();
    formData.append('artwork', file);
    
    const response = await fetch(`${API_BASE_URL}/upload/album-artwork`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  getDefaultArtworkUrl: () => apiCall<{ defaultArtUrl: string }>('/upload/default-album-art'),
};

// Global search API
export const searchApi = {
  global: (query: string) => apiCall<{
    songs: Song[];
    artists: Artist[];
    albums: Album[];
  }>(`/search/${encodeURIComponent(query)}`),
};

// Recommendation API
export const recommendationsApi = {
  getRecommendations: (limit = 20) =>
    apiCall<{ recommendations: Song[]; count: number }>(`/recommendations?limit=${limit}`),

  getTopGenres: (limit = 5) =>
    apiCall<Array<{ genre: string; preference_score: number; play_count: number }>>(`/recommendations/genres?limit=${limit}`),

  getTopArtists: (limit = 5) =>
    apiCall<Array<{ artist_name: string; preference_score: number; play_count: number }>>(`/recommendations/artists?limit=${limit}`),

  regenerateRecommendations: () =>
    apiCall<{ message: string }>(`/recommendations/regenerate`, { method: 'POST' }),
};

// Community types
export interface Community {
  id: number;
  name: string;
  description: string;
  genre?: string;
  created_by?: number;
  creator_name?: string;
  is_public: boolean;
  member_count: number;
  user_role?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: number;
  community_id: number;
  user_id: number;
  title: string;
  content: string;
  song_id?: number;
  post_type: 'discussion' | 'music_share' | 'announcement';
  likes_count: number;
  user_liked: boolean;
  author_name: string;
  author_picture?: string;
  song_title?: string;
  artist_name?: string;
  artwork_url?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

// Community API
export const communitiesApi = {
  // Get public communities
  getPublic: async (limit = 20, offset = 0): Promise<Community[]> => {
    const response = await fetch(`${API_BASE_URL}/communities/public?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch communities');
    return response.json();
  },

  // Get communities by genre
  getByGenre: async (genre: string, limit = 20, offset = 0): Promise<Community[]> => {
    const response = await fetch(`${API_BASE_URL}/communities/genre/${encodeURIComponent(genre)}?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch communities by genre');
    return response.json();
  },

  // Get user's communities
  getMyCommunities: async (): Promise<Community[]> => {
    const response = await fetch(`${API_BASE_URL}/communities/my`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user communities');
    return response.json();
  },

  // Get recommended communities
  getRecommended: async (limit = 10): Promise<Community[]> => {
    const response = await fetch(`${API_BASE_URL}/communities/recommended?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch recommended communities');
    return response.json();
  },

  // Get community details
  getById: async (id: number): Promise<Community> => {
    const response = await fetch(`${API_BASE_URL}/communities/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch community');
    return response.json();
  },

  // Create community
  create: async (data: { name: string; description: string; genre?: string; isPublic?: boolean }): Promise<Community> => {
    const response = await fetch(`${API_BASE_URL}/communities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create community');
    return response.json();
  },

  // Join community
  join: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/communities/${id}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to join community');
    return response.json();
  },

  // Leave community
  leave: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/communities/${id}/leave`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to leave community');
    return response.json();
  },

  // Get community posts
  getPosts: async (id: number, limit = 20, offset = 0): Promise<CommunityPost[]> => {
    const response = await fetch(`${API_BASE_URL}/communities/${id}/posts?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch community posts');
    return response.json();
  },

  // Create post
  createPost: async (communityId: number, data: { title: string; content: string; songId?: number; postType?: string }): Promise<CommunityPost> => {
    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  },

  // Like/unlike post
  togglePostLike: async (postId: number): Promise<{ liked: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/communities/posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle post like');
    return response.json();
  },
};

// Comments API
export const commentsApi = {
  // Get comments for a song (public - no auth required)
  getBySong: (songId: number, page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall<CommentsResponse>(`/comments/song/${songId}?${params.toString()}`);
  },

  // Create a new comment (requires authentication)
  create: (songId: number, content: string) => apiCall<Comment>(`/comments/song/${songId}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),

  // Update a comment (requires authentication and ownership)
  update: (commentId: number, content: string) => apiCall<Comment>(`/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  }),

  // Delete a comment (requires authentication and ownership)
  delete: (commentId: number) => apiCall<{ message: string }>(`/comments/${commentId}`, {
    method: 'DELETE',
  }),
};

// Vector Search API
export const vectorSearchApi = {
  search: (query: string, limit = 10) => apiCall<{ songs: Song[]; query: string; count: number }>(`/vector-search/search?query=${encodeURIComponent(query)}&limit=${limit}`),
  health: () => apiCall<{ status: string; weaviate: string; vllm: string; timestamp: string }>('/vector-search/health'),
  indexAll: () => apiCall<{ message: string; status: string }>('/vector-search/index-all', {
    method: 'POST',
  }),
  indexSong: (songId: number) => apiCall<{ message: string; songId: number }>(`/vector-search/index-song/${songId}`, {
    method: 'POST',
  }),
};