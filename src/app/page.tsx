"use client";
import { useState } from "react";
import { Play, Plus } from "lucide-react";
import songs from "@/mock/songs";
import playlistsData from "@/mock/playlists";

export default function Home() {
  const [search, setSearch] = useState("");
  const [currentSong, setCurrentSong] = useState(null);
  const [playlists, setPlaylists] = useState(playlistsData);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase()) ||
      song.album.toLowerCase().includes(search.toLowerCase())
  );

  const handlePlay = (song) => setCurrentSong(song);

  const handleAddToPlaylist = (song, playlistName) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.name === playlistName && !pl.songs.find((s) => s.id === song.id)
          ? { ...pl, songs: [...pl.songs, song] }
          : pl
      )
    );
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    setPlaylists((prev) => [
      ...prev,
      { name: newPlaylistName, songs: [] },
    ]);
    setNewPlaylistName("");
  };

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">TuneTide</h1>
      <input
        className="w-full p-2 border rounded mb-4"
        placeholder="Search for songs, artists, or albums..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Songs</h2>
        <ul className="grid gap-4">
          {filteredSongs.map((song) => (
            <li key={song.id} className="flex items-center bg-white rounded-xl shadow p-3 gap-4 hover:shadow-lg transition-shadow border">
              <img src={song.artwork} alt={song.album + ' cover'} className="w-16 h-16 rounded-lg object-cover border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{song.title}</div>
                <div className="text-gray-600 text-sm truncate">{song.artist} &bull; <span className="italic">{song.album}</span></div>
                <div className="text-gray-400 text-xs truncate">{song.creator}</div>
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
                        key={pl.name}
                        className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                        onClick={() => handleAddToPlaylist(song, pl.name)}
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
            <li key={pl.name} className="mb-2">
              <div className="font-semibold">{pl.name}</div>
              <ul className="ml-4 text-sm">
                {pl.songs.length === 0 && <li className="text-gray-400">No songs yet</li>}
                {pl.songs.map((song) => (
                  <li key={song.id}>{song.title} <span className="text-gray-500">by {song.artist}</span></li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center gap-4 shadow-lg">
          <img src={currentSong.artwork} alt={currentSong.album + ' cover'} className="w-12 h-12 rounded object-cover border" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{currentSong.title}</div>
            <div className="text-gray-600 text-sm truncate">{currentSong.artist} &bull; <span className="italic">{currentSong.album}</span></div>
          </div>
          <audio src={currentSong.audioUrl} controls autoPlay className="flex-1" />
        </div>
      )}
    </main>
  );
}
