import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import createLogger from './logger.js';

const log = createLogger('db');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'puzzle2d.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

log.info('Database initialized', { path: dbPath });

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Puzzle',
    seed INTEGER NOT NULL,
    images TEXT NOT NULL,
    rounds_config TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_creator INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    pieces_placed INTEGER DEFAULT 0,
    total_pieces INTEGER NOT NULL,
    time_ms INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(player_id, round)
  );
`);

export const createGame = db.prepare(`
  INSERT INTO games (id, name, seed, images, rounds_config) VALUES (?, ?, ?, ?, ?)
`);

export const getGame = db.prepare(`
  SELECT * FROM games WHERE id = ?
`);

export const listGames = db.prepare(`
  SELECT g.id, g.name, g.created_at, g.rounds_config,
    COUNT(p.id) as player_count
  FROM games g
  LEFT JOIN players p ON p.game_id = g.id
  GROUP BY g.id
  ORDER BY g.created_at DESC
  LIMIT 50
`);

export const createPlayer = db.prepare(`
  INSERT INTO players (id, game_id, name, is_creator) VALUES (?, ?, ?, ?)
`);

export const getPlayer = db.prepare(`
  SELECT * FROM players WHERE id = ?
`);

export const getGamePlayers = db.prepare(`
  SELECT * FROM players WHERE game_id = ?
`);

export const upsertProgress = db.prepare(`
  INSERT INTO progress (player_id, game_id, round, pieces_placed, total_pieces, time_ms, completed)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(player_id, round) DO UPDATE SET
    pieces_placed = excluded.pieces_placed,
    time_ms = excluded.time_ms,
    completed = excluded.completed
`);

export const getPlayerProgress = db.prepare(`
  SELECT * FROM progress WHERE player_id = ? AND round = ?
`);

export const getGameProgress = db.prepare(`
  SELECT p.*, pl.name as player_name FROM progress p
  JOIN players pl ON p.player_id = pl.id
  WHERE p.game_id = ?
  ORDER BY p.round, p.time_ms
`);

export const getLeaderboard = db.prepare(`
  SELECT pl.name, 
    SUM(p.time_ms) as total_time,
    COUNT(CASE WHEN p.completed = 1 THEN 1 END) as rounds_completed
  FROM progress p
  JOIN players pl ON p.player_id = pl.id
  WHERE p.game_id = ?
  GROUP BY p.player_id
  ORDER BY rounds_completed DESC, total_time ASC
`);

export default db;
