const pool = require('../src/config/database');

const seedData = async () => {
  try {
    console.log('Seeding database with initial data...');

    // Insert artists
    const artists = [
      { name: 'Fleetwood Mac', bio: 'British-American rock band' },
      { name: 'The Weeknd', bio: 'Canadian singer-songwriter' },
      { name: 'Dua Lipa', bio: 'English singer-songwriter' },
      { name: 'Ed Sheeran', bio: 'English singer-songwriter' },
      { name: 'Harry Styles', bio: 'English singer-songwriter' }
    ];

    const artistIds = {};
    for (const artist of artists) {
      const result = await pool.query(
        'INSERT INTO artists (name, bio) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET bio = $2 RETURNING id',
        [artist.name, artist.bio]
      );
      artistIds[artist.name] = result.rows[0].id;
    }

    // Insert albums
    const albums = [
      { title: 'Rumours', artist: 'Fleetwood Mac', release_year: 1977, artwork_url: 'https://upload.wikimedia.org/wikipedia/en/f/fb/FMacRumours.PNG' },
      { title: 'After Hours', artist: 'The Weeknd', release_year: 2020, artwork_url: 'https://upload.wikimedia.org/wikipedia/en/0/09/The_Weeknd_-_After_Hours.png' },
      { title: 'Future Nostalgia', artist: 'Dua Lipa', release_year: 2020, artwork_url: 'https://upload.wikimedia.org/wikipedia/en/0/0b/Dua_Lipa_-_Future_Nostalgia_%28Official_Album_Cover%29.png' },
      { title: '÷ (Divide)', artist: 'Ed Sheeran', release_year: 2017, artwork_url: 'https://upload.wikimedia.org/wikipedia/en/4/45/Divide_cover.png' },
      { title: 'Fine Line', artist: 'Harry Styles', release_year: 2019, artwork_url: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Harry_Styles_-_Fine_Line.png' }
    ];

    const albumIds = {};
    for (const album of albums) {
      const result = await pool.query(
        'INSERT INTO albums (title, artist_id, release_year, artwork_url) VALUES ($1, $2, $3, $4) ON CONFLICT (title, artist_id) DO UPDATE SET release_year = $3, artwork_url = $4 RETURNING id',
        [album.title, artistIds[album.artist], album.release_year, album.artwork_url]
      );
      albumIds[`${album.title}-${album.artist}`] = result.rows[0].id;
    }

    // Insert songs
    const songs = [
      { title: 'Dreams', artist: 'Fleetwood Mac', album: 'Rumours', duration: 257, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: 200, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', duration: 203, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
      { title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', duration: 233, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      { title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line', duration: 174, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' }
    ];

    for (const song of songs) {
      await pool.query(
        'INSERT INTO songs (title, artist_id, album_id, duration, audio_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [
          song.title,
          artistIds[song.artist],
          albumIds[`${song.album}-${song.artist}`],
          song.duration,
          song.audio_url
        ]
      );
    }

    // Create default playlists
    const playlists = ['Favorites', 'Chill'];
    for (const playlistName of playlists) {
      await pool.query(
        'INSERT INTO playlists (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [playlistName]
      );
    }

    console.log('Database seeded successfully!');
    await pool.end();

  } catch (error) {
    console.error('Error seeding database:', error);
    await pool.end();
    process.exit(1);
  }
};

seedData(); 