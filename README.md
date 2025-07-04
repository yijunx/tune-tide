# 🎵 TuneTide - Music Streaming App

A modern music streaming application inspired by Spotify, built with Next.js, Express.js, PostgreSQL, and MinIO. Features include song search, playlist creation, and instant playback.

## ✨ Features

- 🎵 **Music Search**: Search for songs, artists, and albums
- 🎧 **Instant Playback**: Play songs directly in the browser
- 📝 **Playlist Management**: Create and manage playlists
- 🖼️ **Album Artwork**: Upload and display album artwork using MinIO
- 🎨 **Modern UI**: Beautiful, responsive interface with Apple Music vibes
- 🔍 **Real-time Search**: Fast search across all music content

## 🏗️ Architecture

### Frontend (Next.js 14)

- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety

### Backend (Express.js)

- **Server**: Express.js REST API
- **Database**: PostgreSQL with connection pooling
- **API**: RESTful endpoints with proper error handling
- **CORS**: Enabled for frontend communication
- **MinIO**: Object storage for album artwork
- **Multer**: File uploads

### Database (PostgreSQL)

- **Tables**: artists, albums, songs, playlists, playlist_songs
- **Schema**: myschema
- **Features**: Full-text search, relationships, constraints

### Storage (MinIO)

- **Purpose**: Album artwork storage
- **Bucket**: tunetide-assets
- **Structure**: album-artwork/ directory
- **Access**: Public read, authenticated upload

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- The `utilities` Docker network (create with `docker network create utilities`)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd tune-tide
```

### 2. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This script will:

- Install all dependencies
- Set up the PostgreSQL database
- Seed the database with sample data
- Initialize MinIO bucket and upload default artwork
- Start both frontend and backend servers

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

#### Backend Setup

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
npm run upload-default-artwork
npm run dev
```

#### Frontend Setup

```bash
npm install
npm run dev
```

## 🌐 Services

### Frontend

- **URL**: http://localhost:3000
- **Features**: Music search, playback, playlist management

### Backend API

- **URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Features**: RESTful API for music data and file uploads

### Database

- **Service**: tune-tide-postgres
- **Port**: 5432
- **Database**: local-db
- **Schema**: myschema

### MinIO Object Storage

- **Service**: tune-tide-minio
- **API Port**: 9000
- **Console Port**: 9001
- **Access Key**: minio_access_key
- **Secret Key**: minio_secret_key
- **Bucket**: tunetide-assets
- **Console URL**: http://localhost:9001

## 📡 API Endpoints

### Music Data

- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get song by ID
- `GET /api/songs/search/:query` - Search songs
- `GET /api/artists` - Get all artists
- `GET /api/albums` - Get all albums
- `GET /api/playlists` - Get all playlists
- `GET /api/search/:query` - Global search

### File Upload

- `POST /api/upload/album-artwork` - Upload album artwork
- `GET /api/upload/default-album-art` - Get default artwork URL

## 📁 File Storage

Album artwork is stored in MinIO with the following structure:

```
tunetide-assets/
└── album-artwork/
    ├── default-album-art.jpg
    ├── 1234567890_album1.jpg
    └── 1234567891_album2.jpg
```

### Uploading Album Artwork

1. Use the upload component in the frontend
2. Select an image file (JPG, PNG, etc.)
3. Preview the image
4. Click upload to store in MinIO
5. The returned URL can be used in album records

## 🔧 Development

### Database Schema

The application uses PostgreSQL with the following main tables:

- `artists` - Music artists
- `albums` - Music albums with artwork URLs
- `songs` - Individual songs
- `playlists` - User playlists
- `playlist_songs` - Playlist-song relationships

### Environment Variables

#### Backend (.env)

```env
DB_HOST=tune-tide-postgres
DB_PORT=5432
DB_NAME=local-db
DB_USER=local-user
DB_PASSWORD=local-password
DB_OPTIONS=-c search_path=myschema
PORT=3001
MINIO_ENDPOINT=tune-tide-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_access_key
MINIO_SECRET_KEY=minio_secret_key
MINIO_BUCKET=tunetide-assets
```

#### Frontend (.env.local)

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

## �� Happy listening!
