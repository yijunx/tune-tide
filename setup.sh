#!/bin/bash

echo "🎵 Setting up TuneTide Music Streaming App"
echo "=========================================="

# Check if PostgreSQL is running (you'll need to set this up)
echo "📋 Prerequisites:"
echo "   - PostgreSQL should be running on tune-tide-postgres:5432"
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
EOF
fi

# Setup database
echo "   Setting up database..."
npm run db:setup

# Seed database
echo "   Seeding database with initial data..."
npm run db:seed

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
echo ""
echo "🎵 Happy listening!" 