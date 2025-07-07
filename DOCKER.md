# Docker Setup for TuneTide

This guide explains how to run TuneTide using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Clone the repository and navigate to the project directory:**

   ```bash
   cd tunetide
   ```

2. **Build and start all services:**

   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MinIO Console: http://localhost:9001 (admin/minioadmin)
   - PostgreSQL: localhost:5432

## Services

The Docker Compose setup includes:

- **Frontend**: Next.js application (port 3000)
- **Backend**: Express.js API server (port 3001)
- **PostgreSQL**: Database (port 5432)
- **MinIO**: Object storage for audio files and artwork (port 9000)

## Environment Variables

### Backend Environment Variables

- `DB_HOST`: PostgreSQL host (default: postgres)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: tunetide)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: password)
- `MINIO_ENDPOINT`: MinIO endpoint (default: minio)
- `MINIO_PORT`: MinIO port (default: 9000)
- `MINIO_ACCESS_KEY`: MinIO access key (default: minioadmin)
- `MINIO_SECRET_KEY`: MinIO secret key (default: minioadmin)
- `MINIO_BUCKET`: MinIO bucket name (default: tunetide)
- `SESSION_SECRET`: Session secret (change in production)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

### Frontend Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3001/api)

## Development

### Running in Development Mode

1. **Start only the database and MinIO:**

   ```bash
   docker-compose up postgres minio
   ```

2. **Run frontend and backend locally:**

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm run dev

   # Terminal 2 - Frontend
   npm install
   npm run dev
   ```

### Building Individual Services

**Backend:**

```bash
docker build -t tunetide-backend ./backend
```

**Frontend:**

```bash
docker build -t tunetide-frontend .
```

## Production Deployment

### Using Docker Compose

1. **Set production environment variables:**

   ```bash
   export SESSION_SECRET=your-secure-session-secret
   export DB_PASSWORD=your-secure-db-password
   ```

2. **Build and run:**
   ```bash
   docker-compose -f docker-compose.yml up --build -d
   ```

### Using Individual Containers

1. **Build images:**

   ```bash
   docker build -t tunetide-backend ./backend
   docker build -t tunetide-frontend .
   ```

2. **Run containers:**

   ```bash
   # PostgreSQL
   docker run -d --name postgres \
     -e POSTGRES_DB=tunetide \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -v postgres_data:/var/lib/postgresql/data \
     postgres:15-alpine

   # MinIO
   docker run -d --name minio \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     -v minio_data:/data \
     minio/minio server /data

   # Backend
   docker run -d --name backend \
     -p 3001:3001 \
     -e DB_HOST=postgres \
     -e DB_PASSWORD=password \
     --link postgres \
     --link minio \
     tunetide-backend

   # Frontend
   docker run -d --name frontend \
     -p 3000:3000 \
     -e NEXT_PUBLIC_API_URL=http://localhost:3001/api \
     tunetide-frontend
   ```

## Database Setup

The database schema is automatically initialized when the PostgreSQL container starts. The schema file is mounted at `/docker-entrypoint-initdb.d/schema.sql`.

## MinIO Setup

1. **Access MinIO Console:**

   - URL: http://localhost:9001
   - Username: minioadmin
   - Password: minioadmin

2. **Create bucket:**
   - Bucket name: `tunetide`
   - This is used for storing audio files and artwork

## Troubleshooting

### Common Issues

1. **Port conflicts:**

   - Ensure ports 3000, 3001, 5432, 9000, and 9001 are available
   - Change ports in docker-compose.yml if needed

2. **Database connection issues:**

   - Check if PostgreSQL container is running: `docker-compose ps`
   - View logs: `docker-compose logs postgres`

3. **MinIO connection issues:**

   - Check if MinIO container is running: `docker-compose ps`
   - View logs: `docker-compose logs minio`

4. **Build failures:**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild: `docker-compose build --no-cache`

### Viewing Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs minio

# Follow logs
docker-compose logs -f backend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

## Security Notes

- Change default passwords in production
- Use environment variables for sensitive data
- Consider using Docker secrets for production deployments
- Enable HTTPS in production
- Regularly update base images

## Performance Optimization

- Use Docker volumes for persistent data
- Consider using Docker networks for service communication
- Monitor resource usage with `docker stats`
- Use multi-stage builds to reduce image sizes
