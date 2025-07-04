# 🎵 TuneTide - Music Streaming App

A Spotify-inspired music streaming application built with Next.js, Express, and PostgreSQL. Features include song search, playlist creation, and instant playback.

## ✨ Features

- **Search Songs**: Search by song title, artist, or album
- **Instant Playback**: Click any song to start playing immediately
- **Playlist Management**: Create and manage custom playlists
- **Apple Music-style UI**: Modern, responsive design with album artwork
- **Real-time Search**: Fast search across songs, artists, and albums
- **Database Integration**: Full CRUD operations with PostgreSQL

## 🏗️ Architecture

### Frontend (Next.js 15)

- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety
- **API Integration**: Custom service layer

### Backend (Express.js)

- **Framework**: Express.js
- **Database**: PostgreSQL with full-text search
- **API**: RESTful endpoints with proper error handling
- **CORS**: Enabled for frontend communication

### Database (PostgreSQL)

- **Tables**: artists, albums, songs, playlists, playlist_songs
- **Features**: Full-text search, foreign key relationships, triggers
- **Indexes**: Optimized for search performance

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (can be local or Docker)

### Option 1: Automated Setup

```bash
# Run the setup script
./setup.sh
```

### Option 2: Manual Setup

1. **Clone and install dependencies:**

   ```bash
   npm install
   cd backend && npm install
   ```

2. **Setup database:**

   ```bash
   cd backend
   # Create .env file with your database credentials
   npm run db:setup
   npm run db:seed
   ```

3. **Start the servers:**

   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

4. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health check: http://localhost:3001/api/health

## 📚 API Endpoints

### Songs

- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get song by ID
- `GET /api/songs/search/:query` - Search songs
- `POST /api/songs` - Create new song
- `PUT /api/songs/:id` - Update song
- `DELETE /api/songs/:id` - Delete song

### Artists

- `GET /api/artists` - Get all artists
- `GET /api/artists/:id` - Get artist by ID
- `GET /api/artists/search/:query` - Search artists
- `POST /api/artists` - Create new artist
- `PUT /api/artists/:id` - Update artist
- `DELETE /api/artists/:id` - Delete artist

### Albums

- `GET /api/albums` - Get all albums
- `GET /api/albums/:id` - Get album by ID
- `GET /api/albums/search/:query` - Search albums
- `POST /api/albums` - Create new album
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album

### Playlists

- `GET /api/playlists` - Get all playlists
- `GET /api/playlists/:id` - Get playlist with songs
- `POST /api/playlists` - Create new playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/songs` - Add song to playlist
- `DELETE /api/playlists/:id/songs/:songId` - Remove song from playlist

### Global Search

- `GET /api/search/:query` - Search across songs, artists, and albums

## 🗄️ Database Schema

```sql
-- Artists table
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums table
CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    release_year INTEGER,
    artwork_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Songs table
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
    duration INTEGER,
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlists table
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlist songs junction table
CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ Development

### Adding New Songs

```bash
# Via API
curl -X POST http://localhost:3001/api/songs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Song",
    "artist_id": 1,
    "album_id": 1,
    "duration": 180,
    "audio_url": "https://example.com/song.mp3"
  }'
```

### Database Scripts

```bash
# Setup database schema
cd backend && npm run db:setup

# Seed with sample data
cd backend && npm run db:seed

# Reset database (if needed)
cd backend && npm run db:reset
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**

```env
DB_HOST=tune-tide-postgres
DB_PORT=5432
DB_NAME=local-db
DB_USER=local-user
DB_PASSWORD=local-password
DB_OPTIONS=-c search_path=myschema
PORT=3001
```

**Frontend (.env.local):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🎨 UI Features

- **Responsive Design**: Works on desktop and mobile
- **Album Artwork**: Displays album covers with fallback images
- **Search Interface**: Real-time search with debouncing
- **Playlist Management**: Drag-and-drop style playlist creation
- **Audio Player**: Built-in HTML5 audio controls
- **Loading States**: Proper loading and error handling

## 🚀 Deployment

### Backend Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database setup scripts
4. Deploy to your preferred platform (Heroku, Railway, etc.)

### Frontend Deployment

1. Set `NEXT_PUBLIC_API_URL` to your backend URL
2. Deploy to Vercel, Netlify, or your preferred platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎵 Credits

- Inspired by Spotify's music streaming interface
- Sample data includes popular songs and artists
- Built with modern web technologies for optimal performance
