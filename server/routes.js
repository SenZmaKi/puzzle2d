import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { ROUNDS } from '../shared/constants.js';
import createLogger from './logger.js';
import {
  createGame,
  getGame,
  listGames,
  createPlayer,
  getGamePlayers,
  getGameProgress,
  getLeaderboard,
} from './db.js';

const log = createLogger('routes');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid(12)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

// Create a new game
router.post('/games', upload.array('images', 10), (req, res) => {
  try {
    // Parse custom rounds config from body
    let roundsConfig;
    try {
      roundsConfig = req.body.roundsConfig ? JSON.parse(req.body.roundsConfig) : ROUNDS;
    } catch {
      roundsConfig = ROUNDS;
    }

    const numRounds = roundsConfig.length;

    if (!req.files || req.files.length !== numRounds) {
      log.warn('Game creation failed: wrong image count', { expected: numRounds, received: req.files?.length });
      return res.status(400).json({
        error: `Exactly ${numRounds} images required (one per round)`,
      });
    }

    const gameId = nanoid(10);
    const gameName = (req.body.gameName || 'Untitled Puzzle').trim().slice(0, 60);
    const seed = Math.floor(Math.random() * 2147483647);
    const images = JSON.stringify(req.files.map((f) => f.filename));

    createGame.run(gameId, gameName, seed, images, JSON.stringify(roundsConfig));

    const playerName = req.body.playerName || 'Host';
    const playerId = uuidv4();
    createPlayer.run(playerId, gameId, playerName, 1);

    log.info('Game created', { gameId, gameName, playerName, rounds: numRounds, seed });
    res.json({ gameId, playerId, playerName });
  } catch (err) {
    log.error('Create game error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Browse all games (must be before /games/:id)
router.get('/games', (req, res) => {
  const games = listGames.all();
  log.debug('Browse games', { count: games.length });
  res.json(games.map((g) => ({
    id: g.id,
    name: g.name,
    playerCount: g.player_count,
    roundsConfig: JSON.parse(g.rounds_config || '[]'),
    createdAt: g.created_at,
  })));
});

// Get game info
router.get('/games/:id', (req, res) => {
  const game = getGame.get(req.params.id);
  if (!game) {
    log.warn('Game not found', { gameId: req.params.id });
    return res.status(404).json({ error: 'Game not found' });
  }

  const players = getGamePlayers.all(game.id);
  const images = JSON.parse(game.images);

  const roundsConfig = game.rounds_config ? JSON.parse(game.rounds_config) : ROUNDS;

  log.debug('Game fetched', { gameId: game.id, players: players.length });
  res.json({
    id: game.id,
    name: game.name,
    seed: game.seed,
    images: images.map((img) => `/uploads/${img}`),
    rounds: roundsConfig,
    players: players.map((p) => ({ id: p.id, name: p.name, isCreator: !!p.is_creator })),
    createdAt: game.created_at,
  });
});

// Join a game
router.post('/games/:id/join', (req, res) => {
  const game = getGame.get(req.params.id);
  if (!game) {
    log.warn('Join failed: game not found', { gameId: req.params.id });
    return res.status(404).json({ error: 'Game not found' });
  }

  const { playerName } = req.body;
  if (!playerName || !playerName.trim()) {
    return res.status(400).json({ error: 'Player name required' });
  }

  const playerId = uuidv4();
  createPlayer.run(playerId, game.id, playerName.trim(), 0);

  const players = getGamePlayers.all(game.id);

  log.info('Player joined', { gameId: game.id, playerId, playerName: playerName.trim(), totalPlayers: players.length });
  res.json({
    playerId,
    playerName: playerName.trim(),
    players: players.map((p) => ({ id: p.id, name: p.name, isCreator: !!p.is_creator })),
  });
});

// Get leaderboard
router.get('/games/:id/leaderboard', (req, res) => {
  const game = getGame.get(req.params.id);
  if (!game) {
    log.warn('Leaderboard fetch: game not found', { gameId: req.params.id });
    return res.status(404).json({ error: 'Game not found' });
  }

  const leaderboard = getLeaderboard.all(game.id);
  const progress = getGameProgress.all(game.id);

  log.debug('Leaderboard fetched', { gameId: game.id, entries: leaderboard.length });
  res.json({ leaderboard, progress });
});

// List available sound/music files
router.get('/sounds', (req, res) => {
  const soundsDir = path.join(__dirname, '..', 'client', 'public', 'sounds');
  try {
    if (!fs.existsSync(soundsDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(soundsDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.mp3', '.ogg', '.wav', '.m4a', '.flac'].includes(ext);
    });
    res.json(files);
  } catch {
    res.json([]);
  }
});

export default router;
