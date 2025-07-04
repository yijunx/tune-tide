"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/services/auth';

interface Artist {
  id: number;
  name: string;
}

interface Album {
  id: number;
  title: string;
  artist_name: string;
}

interface Stats {
  songs: number;
  artists: number;
  albums: number;
  users: number;
  playlists: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  
  // Form states
  const [artistForm, setArtistForm] = useState({ name: '', bio: '' });
  const [albumForm, setAlbumForm] = useState({ title: '', artist_id: '', release_year: '' });
  const [songForm, setSongForm] = useState({ 
    title: '', 
    artist_id: '', 
    album_id: '', 
    duration: '',
    genre: ''
  });
  
  // File states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [albumArtworkFile, setAlbumArtworkFile] = useState<File | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }

      if (!currentUser.is_admin) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      await loadData();
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadData = async () => {
    try {
      const [statsRes, artistsRes, albumsRes] = await Promise.all([
        authService.authenticatedRequest('http://localhost:3001/api/admin/stats'),
        authService.authenticatedRequest('http://localhost:3001/api/admin/artists'),
        authService.authenticatedRequest('http://localhost:3001/api/admin/albums')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (artistsRes.ok) setArtists(await artistsRes.json());
      if (albumsRes.ok) setAlbums(await albumsRes.json());
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/');
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authService.authenticatedRequest('http://localhost:3001/api/admin/artists', {
        method: 'POST',
        body: JSON.stringify(artistForm)
      });

      if (response.ok) {
        setArtistForm({ name: '', bio: '' });
        await loadData();
        alert('Artist created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating artist:', error);
      alert('Failed to create artist');
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', albumForm.title);
      formData.append('artist_id', albumForm.artist_id);
      formData.append('release_year', albumForm.release_year);
      
      if (albumArtworkFile) {
        formData.append('artwork', albumArtworkFile);
      }

      const response = await fetch('http://localhost:3001/api/admin/albums', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: formData
      });

      if (response.ok) {
        setAlbumForm({ title: '', artist_id: '', release_year: '' });
        setAlbumArtworkFile(null);
        await loadData();
        alert('Album created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Failed to create album');
    }
  };

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', songForm.title);
      formData.append('artist_id', songForm.artist_id);
      formData.append('album_id', songForm.album_id);
      formData.append('duration', songForm.duration);
      formData.append('genre', songForm.genre);
      
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      if (artworkFile) {
        formData.append('artwork', artworkFile);
      }

      const response = await fetch('http://localhost:3001/api/admin/songs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: formData
      });

      if (response.ok) {
        setSongForm({ title: '', artist_id: '', album_id: '', duration: '', genre: '' });
        setAudioFile(null);
        setArtworkFile(null);
        await loadData();
        alert('Song created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating song:', error);
      alert('Failed to create song');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">TuneTide Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stats.songs}</h3>
              <p className="text-gray-600">Songs</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stats.artists}</h3>
              <p className="text-gray-600">Artists</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stats.albums}</h3>
              <p className="text-gray-600">Albums</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stats.users}</h3>
              <p className="text-gray-600">Users</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stats.playlists}</h3>
              <p className="text-gray-600">Playlists</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Artist */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add Artist</h2>
            <form onSubmit={handleCreateArtist}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={artistForm.name}
                  onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={artistForm.bio}
                  onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Create Artist
              </button>
            </form>
          </div>

          {/* Create Album */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add Album</h2>
            <form onSubmit={handleCreateAlbum}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artist *
                </label>
                <select
                  value={albumForm.artist_id}
                  onChange={(e) => setAlbumForm({ ...albumForm, artist_id: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Artist</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Release Year
                </label>
                <input
                  type="number"
                  value={albumForm.release_year}
                  onChange={(e) => setAlbumForm({ ...albumForm, release_year: e.target.value })}
                  className="w-full p-2 border rounded"
                  min="1900"
                  max="2030"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artwork
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAlbumArtworkFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Create Album
              </button>
            </form>
          </div>

          {/* Create Song */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add Song</h2>
            <form onSubmit={handleCreateSong}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={songForm.title}
                  onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artist *
                </label>
                <select
                  value={songForm.artist_id}
                  onChange={(e) => setSongForm({ ...songForm, artist_id: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Artist</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album
                </label>
                <select
                  value={songForm.album_id}
                  onChange={(e) => setSongForm({ ...songForm, album_id: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Album</option>
                  {albums.map(album => (
                    <option key={album.id} value={album.id}>
                      {album.title} - {album.artist_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={songForm.duration}
                  onChange={(e) => setSongForm({ ...songForm, duration: e.target.value })}
                  className="w-full p-2 border rounded"
                  min="1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre
                </label>
                <input
                  type="text"
                  value={songForm.genre}
                  onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artwork
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
              >
                Create Song
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 