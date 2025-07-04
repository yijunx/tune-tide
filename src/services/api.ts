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

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  songs: T[];
  pagination: PaginationInfo;
}

// Generic API call function
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Get token from localStorage (if running in browser)
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('jwt_token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Songs API
export const songsApi = {
  getAll: (page = 1, limit = 20, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return apiCall<PaginatedResponse<Song>>(`/songs?${params.toString()}`);
  },
  getById: (id: number) => apiCall<Song>(`/songs/${id}`),
  search: (query: string) => apiCall<Song[]>(`/songs/search/${encodeURIComponent(query)}`),
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