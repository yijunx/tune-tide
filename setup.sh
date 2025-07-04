#!/bin/bash

echo "🎵 Setting up TuneTide Music Streaming App"
echo "=========================================="

# Check if PostgreSQL is running (you'll need to set this up)
echo "📋 Prerequisites:"
echo "   - PostgreSQL should be running on tune-tide-postgres:5432"
echo "   - MinIO should be running on tune-tide-minio:9000"
echo "   - Node.js and npm should be installed"
echo ""

# Setup backend
echo "🔧 Setting up backend..."
cd backend

# Install dependencies
echo "   Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "   Creating .env file..."
    cat > .env << EOF
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
EOF
fi

# Setup database
echo "   Setting up database..."
npm run db:setup

# Seed database
echo "   Seeding database with initial data..."
npm run db:seed

# Setup MinIO and upload default artwork
echo "   Setting up MinIO and uploading default artwork..."
npm run upload-default-artwork

# Upload default audio file
echo "   Uploading default audio file..."
npm run upload-default-audio

echo "✅ Backend setup complete!"
echo ""

# Setup frontend
echo "🎨 Setting up frontend..."
cd ..

# Install dependencies
echo "   Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"
echo ""

echo "🚀 To start the application:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "2. In another terminal, start the frontend:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to: http://localhost:3000"
echo ""
echo "📚 API Documentation:"
echo "   Backend API will be available at: http://localhost:3001/api"
echo "   Health check: http://localhost:3001/api/health"
echo "   MinIO Console: http://localhost:9001 (access_key: minio_access_key, secret_key: minio_secret_key)"
echo ""
echo "🎵 Happy listening!" 