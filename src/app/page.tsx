"use client";
import { useState, useEffect } from "react";
import { Play, Plus, LogIn, User, LogOut } from "lucide-react";
import { songsApi, playlistsApi, searchApi, uploadApi, Song, Playlist } from "@/services/api";
import { authService, User as AuthUser } from "@/services/auth";
import AudioPlayer from "@/components/AudioPlayer";

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

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [songsData, playlistsData, defaultArtwork] = await Promise.all([
          songsApi.getAll(),
          playlistsApi.getAll(),
          uploadApi.getDefaultArtworkUrl()
        ]);
        setSongs(songsData);
        setPlaylists(playlistsData);
        setDefaultArtworkUrl(defaultArtwork.defaultArtUrl);
        setArtworkLoaded(true);
        
        // Check authentication
        const currentUser = authService.getCurrentUser();
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

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, load all songs
      try {
        const songsData = await songsApi.getAll();
        setSongs(songsData);
      } catch (err) {
        console.error('Error loading songs:', err);
      }
      return;
    }

    try {
      const searchResults = await searchApi.global(query);
      setSongs(searchResults.songs);
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const handlePlay = (song: Song) => {
    const songIndex = songs.findIndex(s => s.id === song.id);
    setIsLoadingSong(true);
    setCurrentSong(song);
    setCurrentSongIndex(songIndex);
  };

  const handleNext = () => {
    if (currentSongIndex < songs.length - 1) {
      const nextSong = songs[currentSongIndex + 1];
      setCurrentSong(nextSong);
      setCurrentSongIndex(currentSongIndex + 1);
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
    // Auto-play next song
    handleNext();
  };

  const handleSongLoaded = () => {
    setIsLoadingSong(false);
  };

  const handleAddToPlaylist = async (song: Song, playlistId: number) => {
    try {
      await playlistsApi.addSong(playlistId, song.id);
      // Refresh playlists to show updated data
      const updatedPlaylists = await playlistsApi.getAll();
      setPlaylists(updatedPlaylists);
    } catch (err) {
      console.error('Error adding song to playlist:', err);
    }
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
        <h1 className="text-3xl font-bold mb-4">TuneTide</h1>
        <div className="text-center py-8">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">TuneTide</h1>
        <div className="text-red-500 text-center py-8">{error}</div>
        <div className="text-center text-sm text-gray-600">
          Make sure to start the backend server: <code className="bg-gray-100 px-2 py-1 rounded">cd backend && npm run dev</code>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-2xl mx-auto p-4 pb-24">
        {/* Header with login */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">TuneTide</h1>
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
                <span className="text-sm text-gray-600">{user.name}</span>
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
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
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
          className="w-full p-2 border rounded mb-4"
          placeholder="Search for songs, artists, or albums..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            handleSearch(e.target.value);
          }}
        />
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Songs</h2>
          <ul className="grid gap-4">
            {songs.map((song, index) => (
              <li key={song.id} className="flex items-center bg-white rounded-xl shadow p-3 gap-4 hover:shadow-lg transition-shadow border">
                <img 
                  src={getArtworkUrl(song.artwork_url)} 
                  alt={song.album_title + ' cover'} 
                  className="w-16 h-16 rounded-lg object-cover border"
                  onError={(e) => {
                    if (defaultArtworkUrl) {
                      e.currentTarget.src = defaultArtworkUrl;
                    }
                  }}
                  style={{ display: getArtworkUrl(song.artwork_url) ? 'block' : 'none' }}
                />
                {!getArtworkUrl(song.artwork_url) && (
                  <div className="w-16 h-16 rounded-lg border bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{song.title}</div>
                  <div className="text-gray-600 text-sm truncate">{song.artist_name} &bull; <span className="italic">{song.album_title || 'Unknown Album'}</span></div>
                  <div className="text-gray-400 text-xs truncate">{song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}</div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button 
                    onClick={() => handlePlay(song)} 
                    className={`p-2 rounded-full transition-colors ${
                      currentSong?.id === song.id 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'hover:bg-gray-100'
                    }`} 
                    title="Play"
                  >
                    {currentSong?.id === song.id && isLoadingSong ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                  <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded-full" title="Add to playlist">
                      <Plus size={20} />
                    </button>
                    <div className="absolute left-0 top-8 bg-white border rounded shadow-md p-2 hidden group-hover:block z-10 min-w-[120px]">
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                          onClick={() => handleAddToPlaylist(song, pl.id)}
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
            <div className="text-center text-gray-500 py-8">No songs found</div>
          )}
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Playlists</h2>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 p-2 border rounded"
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <button onClick={handleCreatePlaylist} className="px-3 py-2 bg-blue-500 text-white rounded">Create</button>
          </div>
          <ul>
            {playlists.map((pl) => (
              <li key={pl.id} className="mb-2">
                <div className="font-semibold">{pl.name}</div>
                <ul className="ml-4 text-sm">
                  {pl.songs && pl.songs.length > 0 ? (
                    pl.songs.map((song) => (
                      <li key={song.id}>{song.title} <span className="text-gray-500">by {song.artist_name}</span></li>
                    ))
                  ) : (
                    <li className="text-gray-400">No songs yet</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </main>
      
      <AudioPlayer
        currentSong={currentSong}
        defaultArtworkUrl={defaultArtworkUrl}
        onSongEnd={handleSongEnd}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSongLoaded={handleSongLoaded}
      />
    </>
  );
}
