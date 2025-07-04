"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Plus, LogIn, User, LogOut, ChevronDown, ChevronRight, Trash2, History } from "lucide-react";
import { songsApi, playlistsApi, searchApi, uploadApi, playHistoryApi, Song, Playlist, PlayHistory, PaginationInfo } from "@/services/api";
import { authService, User as AuthUser } from "@/services/auth";
import AudioPlayer from "../components/AudioPlayer";

export default function Home() {
  const [search, setSearch] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultArtworkUrl, setDefaultArtworkUrl] = useState<string>("");
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'history'>('songs');
  const [playHistory, setPlayHistory] = useState<PlayHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState<{ total: number; hasMore: boolean }>({ total: 0, hasMore: true });
  const [forcePlay, setForcePlay] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(-1);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [shuffledPlaylist, setShuffledPlaylist] = useState<number[]>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    // Always sync user state from localStorage on mount
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Check if user is logged in and token exists
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
        const currentUser = userStr ? JSON.parse(userStr) : null;

        if (!token || !currentUser) {
          setUser(null);
          setPlaylists([]); // Clear playlists if not logged in
          // Still load songs and artwork for public view
          const [songsResponse, defaultArtwork] = await Promise.all([
            songsApi.getAll(1, 20),
            uploadApi.getDefaultArtworkUrl()
          ]);
          setSongs(songsResponse.songs);
          setPagination(songsResponse.pagination);
          setHasMore(songsResponse.pagination.hasNextPage);
          setDefaultArtworkUrl(defaultArtwork.defaultArtUrl);
          setArtworkLoaded(true);
          setLoading(false);
          return;
        }

        // Only fetch playlists if logged in
        const [songsResponse, playlistsData, defaultArtwork] = await Promise.all([
          songsApi.getAll(1, 20),
          playlistsApi.getAll(),
          uploadApi.getDefaultArtworkUrl()
        ]);
        setSongs(songsResponse.songs);
        setPagination(songsResponse.pagination);
        setHasMore(songsResponse.pagination.hasNextPage);
        setPlaylists(playlistsData);
        setDefaultArtworkUrl(defaultArtwork.defaultArtUrl);
        setArtworkLoaded(true);
        setUser(currentUser);
      } catch (err) {
        setError('Failed to load data. Make sure the backend is running on port 3001.');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(search);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    try {
      setSearchLoading(true);
      if (!query.trim()) {
        // If search is empty, load first page of all songs
        const songsResponse = await songsApi.getAll(1, 20);
        setSongs(songsResponse.songs);
        setPagination(songsResponse.pagination);
        setHasMore(songsResponse.pagination.hasNextPage);
      } else {
        // Search with pagination
        const songsResponse = await songsApi.getAll(1, 20, query);
        setSongs(songsResponse.songs);
        setPagination(songsResponse.pagination);
        setHasMore(songsResponse.pagination.hasNextPage);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handlePlay = async (song: Song, songList?: Song[], startIndex?: number) => {
    const songIndex = songs.findIndex(s => s.id === song.id);
    setIsLoadingSong(true);
    
    // If it's a different song, reset forcePlay first
    if (currentSong?.id !== song.id) {
      setForcePlay(false);
    }
    
    // If a song list is provided, start playlist mode
    if (songList && startIndex !== undefined) {
      startPlaylist(songList, startIndex);
    } else {
      // Single song playback - clear playlist
      setPlaylist([]);
      setCurrentPlaylistIndex(-1);
      setCurrentSong(song);
      setCurrentSongIndex(songIndex);
      setForcePlay(true);
    }
    
    // Record play history if user is logged in
    if (user) {
      try {
        await playHistoryApi.recordPlay(song.id);
      } catch (err) {
        console.error('Error recording play history:', err);
      }
    }
  };

  const handleNext = () => {
    if (currentSongIndex < songs.length - 1) {
      const nextSong = songs[currentSongIndex + 1];
      setCurrentSong(nextSong);
      setCurrentSongIndex(currentSongIndex + 1);
      setForcePlay(true);
    }
  };

  const handlePrevious = () => {
    if (currentSongIndex > 0) {
      const prevSong = songs[currentSongIndex - 1];
      setCurrentSong(prevSong);
      setCurrentSongIndex(currentSongIndex - 1);
    }
  };

  const handleSongEnd = () => {
    // Auto-play next song from playlist or regular songs
    if (playlist.length > 0) {
      handlePlaylistNext();
    } else {
      handleNext();
    }
  };

  const handleSongLoaded = () => {
    setIsLoadingSong(false);
  };

  // Reset forcePlay flag after it's been used
  useEffect(() => {
    if (forcePlay) {
      // Reset the flag after a short delay to allow the AudioPlayer to process it
      const timer = setTimeout(() => {
        setForcePlay(false);
      }, 200); // Increased delay to ensure AudioPlayer has time to process
      return () => clearTimeout(timer);
    }
  }, [forcePlay]);

  // Load more songs for infinite scrolling
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !pagination) return;
    
    try {
      setLoadingMore(true);
      const nextPage = pagination.currentPage + 1;
      const songsResponse = await songsApi.getAll(nextPage, 20, search);
      
      setSongs(prev => [...prev, ...songsResponse.songs]);
      setPagination(songsResponse.pagination);
      setHasMore(songsResponse.pagination.hasNextPage);
    } catch (err) {
      console.error('Error loading more songs:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, pagination, search]);

  // Intersection observer for infinite scrolling
  useEffect(() => {
    if (loadingRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );
      
      observerRef.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loadingMore]);

  const handleAddToPlaylist = async (song: Song, playlistId: number) => {
    try {
      await playlistsApi.addSong(playlistId, song.id);
      // Refresh playlists to show updated data
      const updatedPlaylists = await playlistsApi.getAll();
      setPlaylists(updatedPlaylists);
    } catch (err: any) {
      if (err.message && err.message.includes('Song already in playlist')) {
        alert('This song is already in your playlist.');
      } else {
        alert('Failed to add song to playlist.');
      }
      console.error('Error adding song to playlist:', err);
    }
  };

  // Helper to check if a song is already in a playlist
  const isSongInPlaylist = (song: Song, playlist: Playlist) => {
    return playlist.songs?.some((s) => s.id === song.id);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      await playlistsApi.create({ name: newPlaylistName });
      const updatedPlaylists = await playlistsApi.getAll();
      setPlaylists(updatedPlaylists);
      setNewPlaylistName("");
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await playlistsApi.delete(playlistId);
      const updatedPlaylists = await playlistsApi.getAll();
      setPlaylists(updatedPlaylists);
      // Remove from expanded set if it was expanded
      setExpandedPlaylists(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting playlist:', err);
      alert('Failed to delete playlist.');
    }
  };

  const togglePlaylistExpansion = (playlistId: number) => {
    setExpandedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  const loadPlayHistory = async (offset = 0) => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      const [historyData, countData] = await Promise.all([
        playHistoryApi.getAll(20, offset),
        playHistoryApi.getCount()
      ]);
      
      if (offset === 0) {
        setPlayHistory(historyData);
      } else {
        setPlayHistory(prev => [...prev, ...historyData]);
      }
      
      setHistoryPagination({
        total: countData.total,
        hasMore: offset + historyData.length < countData.total
      });
    } catch (err) {
      console.error('Error loading play history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (tab: 'songs' | 'playlists' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history' && user) {
      loadPlayHistory(); // Always refresh when switching to history tab
    }
  };

  const clearPlayHistory = async () => {
    if (!confirm('Are you sure you want to clear your play history? This action cannot be undone.')) {
      return;
    }
    
    try {
      await playHistoryApi.clear();
      setPlayHistory([]);
      setHistoryPagination({ total: 0, hasMore: false });
    } catch (err) {
      console.error('Error clearing play history:', err);
      alert('Failed to clear play history.');
    }
  };

  // Playlist playback functions
  const startPlaylist = (songList: Song[], startIndex: number = 0) => {
    setPlaylist(songList);
    setCurrentPlaylistIndex(startIndex);
    setCurrentSong(songList[startIndex]);
    setCurrentSongIndex(songs.findIndex(s => s.id === songList[startIndex].id));
    setForcePlay(true);
    
    // Reset shuffle if needed
    if (shuffleMode) {
      generateShuffledPlaylist(songList, startIndex);
    }
  };

  const generateShuffledPlaylist = (songList: Song[], excludeIndex: number) => {
    const indices = songList.map((_, index) => index).filter(index => index !== excludeIndex);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledPlaylist([excludeIndex, ...indices]);
  };

  const getNextSongIndex = () => {
    if (!playlist.length) return -1;
    
    if (repeatMode === 'one') {
      return currentPlaylistIndex;
    }
    
    if (shuffleMode) {
      const currentShuffleIndex = shuffledPlaylist.indexOf(currentPlaylistIndex);
      if (currentShuffleIndex < shuffledPlaylist.length - 1) {
        return shuffledPlaylist[currentShuffleIndex + 1];
      } else if (repeatMode === 'all') {
        generateShuffledPlaylist(playlist, -1);
        return shuffledPlaylist[0];
      }
      return -1;
    } else {
      if (currentPlaylistIndex < playlist.length - 1) {
        return currentPlaylistIndex + 1;
      } else if (repeatMode === 'all') {
        return 0;
      }
      return -1;
    }
  };

  const getPreviousSongIndex = () => {
    if (!playlist.length) return -1;
    
    if (repeatMode === 'one') {
      return currentPlaylistIndex;
    }
    
    if (shuffleMode) {
      const currentShuffleIndex = shuffledPlaylist.indexOf(currentPlaylistIndex);
      if (currentShuffleIndex > 0) {
        return shuffledPlaylist[currentShuffleIndex - 1];
      } else if (repeatMode === 'all') {
        generateShuffledPlaylist(playlist, -1);
        return shuffledPlaylist[shuffledPlaylist.length - 1];
      }
      return -1;
    } else {
      if (currentPlaylistIndex > 0) {
        return currentPlaylistIndex - 1;
      } else if (repeatMode === 'all') {
        return playlist.length - 1;
      }
      return -1;
    }
  };

  const handlePlaylistNext = () => {
    const nextIndex = getNextSongIndex();
    if (nextIndex >= 0) {
      setCurrentPlaylistIndex(nextIndex);
      setCurrentSong(playlist[nextIndex]);
      setCurrentSongIndex(songs.findIndex(s => s.id === playlist[nextIndex].id));
      setForcePlay(true);
    }
  };

  const handlePlaylistPrevious = () => {
    const prevIndex = getPreviousSongIndex();
    if (prevIndex >= 0) {
      setCurrentPlaylistIndex(prevIndex);
      setCurrentSong(playlist[prevIndex]);
      setCurrentSongIndex(songs.findIndex(s => s.id === playlist[prevIndex].id));
      setForcePlay(true);
    }
  };

  const toggleShuffle = () => {
    setShuffleMode(!shuffleMode);
    if (!shuffleMode && playlist.length > 0) {
      generateShuffledPlaylist(playlist, currentPlaylistIndex);
    }
  };

  const toggleRepeat = () => {
    setRepeatMode(
      repeatMode === 'none' ? 'all' :
      repeatMode === 'all' ? 'one' : 'none'
    );
  };

  const handleLogin = () => {
    authService.login();
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const handleAdminAccess = () => {
    window.location.href = '/admin';
  };

  // Helper function to get artwork URL with fallback
  const getArtworkUrl = (artworkUrl?: string) => {
    if (artworkUrl) return artworkUrl;
    if (artworkLoaded && defaultArtworkUrl) return defaultArtworkUrl;
    return ''; // Return empty string to prevent loading static file
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">TuneTide</h1>
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">TuneTide</h1>
        <div className="text-red-500 dark:text-red-400 text-center py-8">{error}</div>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Make sure to start the backend server: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white">cd backend && npm run dev</code>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-2xl mx-auto p-4 pb-24">
        {/* Header with login */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TuneTide</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                {user.picture_url && (
                  <img 
                    src={user.picture_url} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                {user.is_admin && (
                  <button
                    onClick={handleAdminAccess}
                    className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                <LogIn size={16} />
                Login with Google
              </button>
            )}
          </div>
        </div>

        <input
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="Search for songs, artists, or albums..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => handleTabChange('songs')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'songs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Songs
          </button>
          {user && (
            <>
              <button
                onClick={() => handleTabChange('playlists')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'playlists'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Playlists
              </button>
              <button
                onClick={() => handleTabChange('history')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <History size={14} />
                History
              </button>
            </>
          )}
        </div>
        
        {/* Songs Tab Content */}
        {activeTab === 'songs' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Songs</h2>
                {pagination && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({pagination.totalItems} found)
                  </span>
                )}
                {searchLoading && (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Searching...</span>
                  </div>
                )}
              </div>
              {songs.length > 0 && (
                <button
                  onClick={() => handlePlay(songs[0], songs, 0)}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  title="Play all songs"
                >
                  <Play size={14} />
                  Play All
                </button>
              )}
            </div>
            <ul className="grid gap-4">
              {songs.map((song, index) => (
                <li key={song.id} className={`flex items-center rounded-xl shadow p-3 gap-4 hover:shadow-lg transition-all border ${
                  currentSong?.id === song.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <img 
                    src={getArtworkUrl(song.artwork_url)} 
                    alt={song.album_title + ' cover'} 
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                    onError={(e) => {
                      if (defaultArtworkUrl) {
                        e.currentTarget.src = defaultArtworkUrl;
                      }
                    }}
                    style={{ display: getArtworkUrl(song.artwork_url) ? 'block' : 'none' }}
                  />
                  {!getArtworkUrl(song.artwork_url) && (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 dark:text-gray-500 text-xs">No Image</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-gray-900 dark:text-white">{song.title}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm truncate">{song.artist_name} &bull; <span className="italic">{song.album_title || 'Unknown Album'}</span></div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs truncate">{song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {currentSong?.id === song.id ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-end gap-0.5 h-4">
                          <div className="w-0.5 bg-blue-500 dark:bg-blue-200 rounded-full animate-sound-bar-1"></div>
                          <div className="w-0.5 bg-blue-500 dark:bg-blue-200 rounded-full animate-sound-bar-2"></div>
                          <div className="w-0.5 bg-blue-500 dark:bg-blue-200 rounded-full animate-sound-bar-3"></div>
                          <div className="w-0.5 bg-blue-500 dark:bg-blue-200 rounded-full animate-sound-bar-4"></div>
                        </div>
                        <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">Now Playing</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handlePlay(song)} 
                        className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        title="Play"
                      >
                        <Play size={20} className="ml-0.5" />
                      </button>
                    )}
                    <div className="relative group">
                      <button 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"
                        title="Add to playlist"
                      >
                        <Plus size={20} />
                      </button>
                      <div className="absolute left-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md p-2 hidden group-hover:block z-10 min-w-[120px]">
                        {playlists.map((pl) => (
                          <button
                            key={pl.id}
                            className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleAddToPlaylist(song, pl.id)}
                            disabled={isSongInPlaylist(song, pl)}
                          >
                            {pl.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {songs.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">No songs found</div>
            )}
            
            {/* Loading indicator for infinite scroll */}
            {hasMore && (
              <div ref={loadingRef} className="text-center py-4">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600 dark:text-gray-400">Loading more songs...</span>
                  </div>
                ) : (
                  <div className="h-4" /> // Invisible element for intersection observer
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Playlists Tab Content */}
        {activeTab === 'playlists' && user && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Playlists</h2>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="New playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <button onClick={handleCreatePlaylist} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Create</button>
            </div>
            <ul>
              {playlists.map((pl) => (
                <li key={pl.id} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePlaylistExpansion(pl.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={expandedPlaylists.has(pl.id) ? "Collapse" : "Expand"}
                      >
                        {expandedPlaylists.has(pl.id) ? (
                          <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                      <span className="font-semibold text-gray-900 dark:text-white">{pl.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({pl.songs?.length || 0} songs)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pl.songs && pl.songs.length > 0 && (
                        <button
                          onClick={() => handlePlay(pl.songs![0], pl.songs!, 0)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                          title="Play all songs in playlist"
                        >
                          <Play size={12} />
                          Play All
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePlaylist(pl.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400"
                        title="Delete playlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {expandedPlaylists.has(pl.id) && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                      {pl.songs && pl.songs.length > 0 ? (
                        <ul className="space-y-2">
                          {pl.songs.map((song) => (
                            <li key={song.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{song.title}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {song.artist_name} • {song.album_title || 'Unknown Album'}
                                </div>
                              </div>
                              <button
                                onClick={() => handlePlay(song, pl.songs || [], pl.songs?.findIndex(s => s.id === song.id) || 0)}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors text-blue-600 dark:text-blue-400 ml-2"
                                title="Play song"
                              >
                                <Play size={14} className="ml-0.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 text-center py-4">No songs yet</div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* History Tab Content */}
        {activeTab === 'history' && user && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Play History</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {historyPagination.total} songs played
                </span>
                {playHistory.length > 0 && (
                  <button
                    onClick={() => handlePlay(playHistory[0], playHistory.map(h => ({
                      id: h.song_id,
                      title: h.title,
                      artist_id: h.artist_id,
                      artist_name: h.artist_name,
                      album_title: h.album_title,
                      artwork_url: h.artwork_url,
                      audio_url: h.audio_url,
                      duration: h.duration,
                      genre: h.genre
                    })), 0)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                    title="Play all songs in history"
                  >
                    <Play size={12} />
                    Play All
                  </button>
                )}
                <button
                  onClick={clearPlayHistory}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  title="Clear all play history"
                >
                  Clear History
                </button>
              </div>
            </div>
            
            {historyLoading && playHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <span className="text-gray-600 dark:text-gray-400">Loading play history...</span>
              </div>
            ) : playHistory.length > 0 ? (
              <ul className="space-y-3">
                {playHistory.map((historyItem) => (
                  <li key={historyItem.id} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <img 
                      src={getArtworkUrl(historyItem.artwork_url)} 
                      alt={historyItem.album_title + ' cover'} 
                      className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        if (defaultArtworkUrl) {
                          e.currentTarget.src = defaultArtworkUrl;
                        }
                      }}
                      style={{ display: getArtworkUrl(historyItem.artwork_url) ? 'block' : 'none' }}
                    />
                    {!getArtworkUrl(historyItem.artwork_url) && (
                      <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500 text-xs">No Image</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{historyItem.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {historyItem.artist_name} • {historyItem.album_title || 'Unknown Album'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Played {new Date(historyItem.played_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlay({
                        id: historyItem.song_id,
                        title: historyItem.title,
                        artist_id: historyItem.artist_id,
                        artist_name: historyItem.artist_name,
                        album_title: historyItem.album_title,
                        artwork_url: historyItem.artwork_url,
                        audio_url: historyItem.audio_url,
                        duration: historyItem.duration,
                        genre: historyItem.genre
                      }, playHistory.map(h => ({
                        id: h.song_id,
                        title: h.title,
                        artist_id: h.artist_id,
                        artist_name: h.artist_name,
                        album_title: h.album_title,
                        artwork_url: h.artwork_url,
                        audio_url: h.audio_url,
                        duration: h.duration,
                        genre: h.genre
                      })), playHistory.findIndex(h => h.song_id === historyItem.song_id))}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                      title="Play song"
                    >
                      <Play size={16} className="ml-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No play history yet. Start playing songs to see them here!
              </div>
            )}
            
            {/* Load more history */}
            {historyPagination.hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => loadPlayHistory(playHistory.length)}
                  disabled={historyLoading}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {historyLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      <AudioPlayer
        currentSong={currentSong}
        defaultArtworkUrl={defaultArtworkUrl}
        onSongEnd={handleSongEnd}
        onNext={playlist.length > 0 ? handlePlaylistNext : handleNext}
        onPrevious={playlist.length > 0 ? handlePlaylistPrevious : handlePrevious}
        onSongLoaded={handleSongLoaded}
        forcePlay={forcePlay}
        playlist={playlist}
        currentPlaylistIndex={currentPlaylistIndex}
        shuffleMode={shuffleMode}
        repeatMode={repeatMode}
        onShuffleToggle={toggleShuffle}
        onRepeatToggle={toggleRepeat}
      />
      
      <style jsx>{`
        @keyframes soundBar1 {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes soundBar2 {
          0%, 100% { height: 8px; }
          50% { height: 12px; }
        }
        @keyframes soundBar3 {
          0%, 100% { height: 12px; }
          50% { height: 8px; }
        }
        @keyframes soundBar4 {
          0%, 100% { height: 16px; }
          50% { height: 4px; }
        }
        .animate-sound-bar-1 {
          animation: soundBar1 1s ease-in-out infinite;
        }
        .animate-sound-bar-2 {
          animation: soundBar2 1s ease-in-out infinite 0.1s;
        }
        .animate-sound-bar-3 {
          animation: soundBar3 1s ease-in-out infinite 0.2s;
        }
        .animate-sound-bar-4 {
          animation: soundBar4 1s ease-in-out infinite 0.3s;
        }
      `}</style>
    </>
  );
}
