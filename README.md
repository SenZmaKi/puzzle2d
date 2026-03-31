# 🧩 PUZZLE2D — Good people playing good games

A multiplayer browser-based jigsaw puzzle game with a retro arcade aesthetic. Upload 3 images, share a link, and race your friends to solve puzzles across 3 rounds of increasing difficulty.

![Node.js](https://img.shields.io/badge/Node.js-20-green) ![React](https://img.shields.io/badge/React-18-blue) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black) ![SQLite](https://img.shields.io/badge/SQLite-3-lightblue) ![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## Features

- **3 Rounds** of increasing difficulty: 15 → 25 → 35 pieces (configurable)
- **Real-time multiplayer** — compete against friends with live progress tracking via WebSockets
- **Jigsaw puzzle engine** — canvas-based with bezier curve edges, drag & drop, snap-to-grid, group merging
- **Seeded randomization** — everyone gets the exact same puzzle (reproducible via PRNG)
- **Scoring system** — exponential decay based on time and piece count
- **Retro arcade aesthetic** — CRT scanlines, pixel fonts, neon glow effects
- **Background music** — supports custom chiptune/8-bit tracks
- **Sound effects** — piece snap, connect, and round completion sounds (Web Audio API)
- **Shareable links** — create a game, share the URL, friends join instantly
- **Browse games** — find and join existing games
- **Docker ready** — single-command deployment

## Quick Start

### Prerequisites

- **Node.js 20+** and **npm**

### Install & Run

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Start development mode (client + server concurrently)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Production Build

```bash
# Build the client
npm run build

# Start the production server
npm start
```

Then open http://localhost:3001.

## How to Play

1. **Create a Game** — Enter your name, name the puzzle, pick images for each round, and click "Create Game"
2. **Share the Link** — Copy the generated URL and send it to friends
3. **Friends Join** — They open the link, enter their name, and wait in the lobby
4. **Host Starts** — The creator clicks "Start Game" when everyone's ready
5. **Solve Puzzles** — Drag pieces from the scattered area to the central canvas. Pieces snap when close to their correct position. Connect pieces together outside the canvas too!
6. **Complete Rounds** — After each round, see your time and score. Wait for opponents, then advance to the next round.
7. **Final Leaderboard** — After all rounds, see the full leaderboard with total scores

## Project Structure

```
puzzle2d/
├── shared/
│   └── constants.js          # Round configs (piece counts, grid dimensions)
├── client/                   # React 18 + Vite
│   ├── src/
│   │   ├── engine/           # Canvas-based jigsaw puzzle engine
│   │   ├── components/       # React UI components
│   │   ├── utils/            # Socket, sounds, music, logger, seeded PRNG
│   │   └── styles/           # Retro arcade CSS
│   └── public/
│       └── sounds/           # Place BGM tracks here (.mp3, .ogg, .wav)
├── server/                   # Express + Socket.IO + SQLite
│   ├── index.js              # Server entry point
│   ├── db.js                 # SQLite schema and queries
│   ├── routes.js             # REST API routes
│   ├── socket.js             # WebSocket event handlers
│   └── logger.js             # Structured server logging
├── docs/
│   └── DOCKER.md             # Docker deployment guide
├── Dockerfile                # Multi-stage production build
└── docker-compose.yml        # Docker Compose config
```

## Configuration

### Round Piece Counts

Edit `shared/constants.js` to change the default rounds:

```js
export const ROUNDS = [
  { round: 1, pieces: 15, cols: 5, rows: 3 },
  { round: 2, pieces: 25, cols: 5, rows: 5 },
  { round: 3, pieces: 35, cols: 7, rows: 5 },
];
```

Players can also customize rounds per-game when creating from the UI.

### Background Music

Place `.mp3`, `.ogg`, `.wav`, `.m4a`, or `.flac` files in `client/public/sounds/`. The game randomly selects and loops tracks. Chiptune/8-bit tracks work great with the retro aesthetic.

### Environment Variables

| Variable    | Default                    | Description                       |
|-------------|----------------------------|-----------------------------------|
| `PORT`      | `3001`                     | Server port                       |
| `NODE_ENV`  | `development`              | `production` serves built client  |
| `DB_PATH`   | `server/puzzle2d.db`       | SQLite database file path         |
| `LOG_LEVEL` | `info`                     | Server log level: debug/info/warn/error |

### Client-Side Logging

Open browser DevTools console. In development, all logs show automatically. In production, enable debug logs:

```js
localStorage.setItem('puzzle2d_log_level', 'debug');
```

## API Endpoints

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | `/api/games`                  | Create a new game        |
| GET    | `/api/games`                  | Browse all games         |
| GET    | `/api/games/:id`              | Get game details         |
| POST   | `/api/games/:id/join`         | Join a game              |
| GET    | `/api/games/:id/leaderboard`  | Get game leaderboard     |
| GET    | `/api/sounds`                 | List available BGM files |

## WebSocket Events

| Event                   | Direction       | Description                          |
|-------------------------|-----------------|--------------------------------------|
| `join_game`             | Client → Server | Join a game room                     |
| `start_game`            | Client → Server | Host starts the game                 |
| `piece_placed`          | Client → Server | Report piece placement               |
| `round_complete`        | Client → Server | Report round completion              |
| `game_cancelled`        | Client → Server | Player quits                         |
| `players_update`        | Server → Client | Updated player list                  |
| `game_started`          | Server → Client | Game has started                     |
| `opponent_progress`     | Server → Client | Opponent placed a piece              |
| `opponent_round_complete` | Server → Client | Opponent finished a round          |

## Docker

See [docs/DOCKER.md](docs/DOCKER.md) for full Docker deployment instructions.

Quick start:

```bash
docker compose up --build -d
```

## Tech Stack

- **Frontend**: React 18, Vite, HTML5 Canvas, Lucide React icons
- **Backend**: Express, Socket.IO, better-sqlite3
- **Styling**: Custom CSS with Press Start 2P + Silkscreen + DM Mono fonts
- **Audio**: Web Audio API (SFX), HTML Audio (BGM)
- **Randomization**: Mulberry32 seeded PRNG
- **Deployment**: Docker (multi-stage Node 20 Alpine)

## License

MIT
