import { ROUNDS } from '../shared/constants.js';
import { upsertProgress, getGamePlayers } from './db.js';
import createLogger from './logger.js';

const log = createLogger('socket');

// Track active socket connections: socketId -> { playerId, gameId, playerName }
const activeSockets = new Map();

export function setupSocket(io) {
  io.on('connection', (socket) => {
    log.info('Socket connected', { socketId: socket.id });

    socket.on('join_game', ({ gameId, playerId, playerName }) => {
      socket.join(gameId);
      activeSockets.set(socket.id, { playerId, gameId, playerName });

      // Notify others
      socket.to(gameId).emit('player_joined', { playerId, playerName });

      // Send current player list to the joiner
      const playersInRoom = [];
      for (const [, data] of activeSockets) {
        if (data.gameId === gameId) {
          playersInRoom.push({ playerId: data.playerId, playerName: data.playerName });
        }
      }
      log.info('Player joined room', { gameId, playerId, playerName, roomSize: playersInRoom.length });
      io.to(gameId).emit('players_update', playersInRoom);
    });

    socket.on('start_game', ({ gameId }) => {
      log.info('Game started', { gameId });
      io.to(gameId).emit('game_started');
    });

    socket.on('piece_placed', ({ gameId, playerId, playerName, round, piecesPlaced, totalPieces }) => {
      // Save progress to DB
      upsertProgress.run(playerId, gameId, round, piecesPlaced, totalPieces, 0, 0);

      log.debug('Piece placed', { gameId, playerName, round, progress: `${piecesPlaced}/${totalPieces}` });

      // Broadcast to other players in the game
      socket.to(gameId).emit('opponent_progress', {
        playerId,
        playerName,
        round,
        piecesPlaced,
        totalPieces,
      });
    });

    socket.on('round_complete', ({ gameId, playerId, playerName, round, timeMs, totalPieces }) => {
      // Save completed progress
      upsertProgress.run(playerId, gameId, round, totalPieces, totalPieces, timeMs, 1);

      log.info('Round completed', { gameId, playerName, round, timeMs, totalPieces });

      // Broadcast completion
      socket.to(gameId).emit('opponent_round_complete', {
        playerId,
        playerName,
        round,
        timeMs,
      });
    });

    socket.on('game_cancelled', ({ gameId, playerId, playerName }) => {
      log.info('Game cancelled by player', { gameId, playerName });
      socket.to(gameId).emit('player_cancelled', { playerId, playerName });
    });

    socket.on('disconnect', () => {
      const data = activeSockets.get(socket.id);
      if (data) {
        log.info('Socket disconnected', { socketId: socket.id, playerName: data.playerName, gameId: data.gameId });
        socket.to(data.gameId).emit('player_left', {
          playerId: data.playerId,
          playerName: data.playerName,
        });

        // Update players list
        activeSockets.delete(socket.id);
        const playersInRoom = [];
        for (const [, d] of activeSockets) {
          if (d.gameId === data.gameId) {
            playersInRoom.push({ playerId: d.playerId, playerName: d.playerName });
          }
        }
        io.to(data.gameId).emit('players_update', playersInRoom);
      } else {
        log.debug('Socket disconnected (no game)', { socketId: socket.id });
      }
    });
  });
}
