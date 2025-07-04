# TuneTide Backend

A Node.js/Express backend for the TuneTide music streaming application with PostgreSQL database.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create `.env` file:**

   ```bash
   cp .env.example .env
   ```

   Or create `.env` manually with:

   ```
   DB_HOST=tune-tide-postgres
   DB_PORT=5432
   DB_NAME=local-db
   DB_USER=local-user
   DB_PASSWORD=local-password
   DB_OPTIONS=-c search_path=myschema
   PORT=3001
   ```

3. **Setup database:**

   ```bash
   npm run db:setup
   ```

4. **Seed database with initial data:**

   ```bash
   npm run db:seed
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

## API Endpoints

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
- `GET /api/albums/artist/:artistId` - Get albums by artist
- `POST /api/albums` - Create new album
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album

### Songs

- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get song by ID
- `GET /api/songs/search/:query` - Search songs
- `GET /api/songs/artist/:artistId` - Get songs by artist
- `GET /api/songs/album/:albumId` - Get songs by album
- `POST /api/songs` - Create new song
- `PUT /api/songs/:id` - Update song
- `DELETE /api/songs/:id` - Delete song

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

### Health Check

- `GET /api/health` - API health status
