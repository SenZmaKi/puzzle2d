# Docker Deployment Guide

This guide covers deploying Puzzle2D with Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

## Quick Start

```bash
# Build and start in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app will be available at **http://localhost:3001**.

## Architecture

The Docker setup uses a **multi-stage build**:

1. **Build stage** (node:20-alpine) — Installs client dependencies and runs `vite build`
2. **Production stage** (node:20-alpine) — Installs server dependencies, copies built client assets, runs Express

### What's inside the container

```
/app/
├── shared/constants.js       # Shared round configuration
├── server/                   # Express + Socket.IO server
│   ├── index.js, db.js, routes.js, socket.js, logger.js
│   └── uploads/              # Uploaded puzzle images (volume-mounted)
├── client/
│   ├── dist/                 # Built React app (served as static files)
│   └── public/sounds/        # BGM music files
└── data/
    └── puzzle2d.db           # SQLite database (volume-mounted)
```

## Volumes

Two named volumes are used for persistent data:

| Volume         | Mount Path              | Contents                    |
|----------------|-------------------------|-----------------------------|
| `uploads-data` | `/app/server/uploads`   | Uploaded puzzle images      |
| `db-data`      | `/app/data`             | SQLite database file        |

This ensures data survives container restarts and rebuilds.

## Environment Variables

Configure via `docker-compose.yml` or `docker run -e`:

| Variable    | Default                | Description                                |
|-------------|------------------------|--------------------------------------------|
| `PORT`      | `3001`                 | Port the server listens on                 |
| `NODE_ENV`  | `production`           | Set automatically in Dockerfile            |
| `DB_PATH`   | `/app/data/puzzle2d.db`| SQLite database file location              |
| `LOG_LEVEL` | `info`                 | Logging verbosity: `debug`, `info`, `warn`, `error` |

## Custom Port

To expose on a different host port:

```yaml
# docker-compose.yml
services:
  puzzle2d:
    ports:
      - "8080:3001"  # Access at http://localhost:8080
```

Or with `docker run`:

```bash
docker run -p 8080:3001 puzzle2d
```

## Adding Background Music

Place `.mp3`, `.ogg`, `.wav`, `.m4a`, or `.flac` files in `client/public/sounds/` **before building** the Docker image. They'll be baked into the image.

To add music after the image is built, mount a host directory:

```yaml
# docker-compose.yml
services:
  puzzle2d:
    volumes:
      - uploads-data:/app/server/uploads
      - db-data:/app/data
      - ./my-music:/app/client/public/sounds  # Add this line
```

## Building Manually

```bash
# Build the image
docker build -t puzzle2d .

# Run the container
docker run -d \
  --name puzzle2d \
  -p 3001:3001 \
  -v puzzle2d-uploads:/app/server/uploads \
  -v puzzle2d-db:/app/data \
  puzzle2d
```

## Verbose Logging

Enable debug-level logs for troubleshooting:

```yaml
# docker-compose.yml
environment:
  - LOG_LEVEL=debug
```

Or:

```bash
docker run -e LOG_LEVEL=debug -p 3001:3001 puzzle2d
```

Server logs include:
- HTTP request/response with status codes and timing
- Socket.IO connections, disconnections, and events
- Game creation, player joins, round completions
- Database initialization

## Health Check

Check if the server is responding:

```bash
curl http://localhost:3001/api/games
# Returns JSON array of games (empty if none created)
```

## Backup & Restore

### Backup

```bash
# Copy the database
docker compose cp puzzle2d:/app/data/puzzle2d.db ./backup.db

# Copy uploaded images
docker compose cp puzzle2d:/app/server/uploads ./backup-uploads
```

### Restore

```bash
docker compose cp ./backup.db puzzle2d:/app/data/puzzle2d.db
docker compose cp ./backup-uploads/. puzzle2d:/app/server/uploads
docker compose restart
```

## Updating

```bash
# Pull latest code, then rebuild
docker compose down
docker compose up --build -d
```

Your data persists in named volumes across rebuilds.

## Troubleshooting

### Container won't start

```bash
docker compose logs puzzle2d
```

Common issues:
- Port 3001 already in use → change the host port in `docker-compose.yml`
- Permission issues with volumes → ensure Docker has write access

### Database locked errors

If you see `SQLITE_BUSY` errors, ensure only one container instance is running:

```bash
docker compose ps
```

### Images not loading

Check that the uploads volume is properly mounted:

```bash
docker compose exec puzzle2d ls -la /app/server/uploads
```

### No sound/music

Ensure music files exist in the container:

```bash
docker compose exec puzzle2d ls -la /app/client/public/sounds
```
