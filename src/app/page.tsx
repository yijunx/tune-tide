"use client";
import { useState, useEffect } from "react";
import { Play, Plus } from "lucide-react";
import { songsApi, playlistsApi, searchApi, uploadApi, Song, Playlist } from "@/services/api";

export default function Home() {
  const [search, setSearch] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultArtworkUrl, setDefaultArtworkUrl] = useState<string>("");
  const [artworkLoaded, setArtworkLoaded] = useState(false);

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

  const handlePlay = (song: Song) => setCurrentSong(song);

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
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">TuneTide</h1>
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
          {songs.map((song) => (
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
                <button onClick={() => handlePlay(song)} className="p-2 hover:bg-gray-100 rounded-full" title="Play">
                  <Play size={20} />
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
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center gap-4 shadow-lg">
          <img 
            src={getArtworkUrl(currentSong.artwork_url)} 
            alt={currentSong.album_title + ' cover'} 
            className="w-12 h-12 rounded object-cover border"
            onError={(e) => {
              if (defaultArtworkUrl) {
                e.currentTarget.src = defaultArtworkUrl;
              }
            }}
            style={{ display: getArtworkUrl(currentSong.artwork_url) ? 'block' : 'none' }}
          />
          {!getArtworkUrl(currentSong.artwork_url) && (
            <div className="w-12 h-12 rounded border bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{currentSong.title}</div>
            <div className="text-gray-600 text-sm truncate">{currentSong.artist_name} &bull; <span className="italic">{currentSong.album_title || 'Unknown Album'}</span></div>
          </div>
          <audio src={currentSong.audio_url} controls autoPlay className="flex-1" />
        </div>
      )}
    </main>
  );
}
