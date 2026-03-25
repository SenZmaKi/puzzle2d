import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import createLogger from '../utils/logger';
import JoinScreen from './JoinScreen';
import Lobby from './Lobby';
import Game from './Game';
import RoundComplete from './RoundComplete';
import GameComplete from './GameComplete';

const log = createLogger('GamePage');

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading, join, lobby, playing, round_complete, game_complete
  const [currentRound, setCurrentRound] = useState(0);
  const [roundTime, setRoundTime] = useState(0);
  const [players, setPlayers] = useState([]);
  const [opponents, setOpponents] = useState({});
  const [error, setError] = useState('');

  // Load game data
  useEffect(() => {
    log.info('Loading game data', { gameId });
    fetch(`/api/games/${gameId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Game not found');
        return r.json();
      })
      .then((data) => {
        log.info('Game data loaded', { gameId, rounds: data.rounds?.length, players: data.players?.length });
        setGameData(data);
        // Check if already joined
        const stored = localStorage.getItem(`puzzle2d_player_${gameId}`);
        if (stored) {
          const info = JSON.parse(stored);
          log.info('Resuming session', { playerId: info.playerId, playerName: info.playerName });
          setPlayerInfo(info);
          setPhase('lobby');
        } else {
          setPhase('join');
        }
      })
      .catch((err) => {
        log.error('Failed to load game', { gameId, error: err.message });
        setError('Game not found!');
        setPhase('error');
      });
  }, [gameId]);

  // Socket connection
  useEffect(() => {
    if (!playerInfo || !gameData) return;

    socket.connect();
    log.info('Socket connecting', { gameId, playerId: playerInfo.playerId });

    socket.emit('join_game', {
      gameId,
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
    });

    socket.on('players_update', (playersList) => {
      log.debug('Players updated', { count: playersList.length });
      setPlayers(playersList);
    });

    socket.on('game_started', () => {
      log.info('Game started');
      setPhase('playing');
      setCurrentRound(0);
    });

    socket.on('opponent_progress', ({ playerId, playerName, round, piecesPlaced, totalPieces }) => {
      log.debug('Opponent progress', { playerName, round, progress: `${piecesPlaced}/${totalPieces}` });
      setOpponents((prev) => ({
        ...prev,
        [playerId]: { playerName, round, piecesPlaced, totalPieces },
      }));
    });

    socket.on('opponent_round_complete', ({ playerId, playerName, round, timeMs }) => {
      log.info('Opponent round complete', { playerName, round, timeMs });
      setOpponents((prev) => ({
        ...prev,
        [playerId]: { ...prev[playerId], playerName, round, completed: true, timeMs },
      }));
    });

    socket.on('player_joined', ({ playerName }) => {
      // Notification handled by players_update
    });

    socket.on('player_left', ({ playerName }) => {
      // Notification handled by players_update
    });

    return () => {
      log.debug('Cleaning up socket listeners');
      socket.off('players_update');
      socket.off('game_started');
      socket.off('opponent_progress');
      socket.off('opponent_round_complete');
      socket.off('player_joined');
      socket.off('player_left');
      socket.disconnect();
    };
  }, [playerInfo, gameData, gameId]);

  const handleJoin = async (name) => {
    try {
      log.info('Joining game', { gameId, playerName: name });
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const info = {
        playerId: data.playerId,
        playerName: data.playerName,
        isCreator: false,
      };
      localStorage.setItem(`puzzle2d_player_${gameId}`, JSON.stringify(info));
      setPlayerInfo(info);
      log.info('Joined successfully', { playerId: data.playerId, totalPlayers: data.players.length });
      // Normalize API player format to match socket format
      setPlayers(
        data.players.map((p) => ({
          playerId: p.id || p.playerId,
          playerName: p.name || p.playerName,
        }))
      );
      setPhase('lobby');
    } catch (err) {
      log.error('Join failed', { error: err.message });
      setError(err.message);
    }
  };

  const handleStartGame = () => {
    log.info('Starting game', { gameId });
    socket.emit('start_game', { gameId });
  };

  const handleRoundComplete = (timeMs) => {
    log.info('Round complete', { round: currentRound, timeMs, pieces: gameData.rounds[currentRound].pieces });
    setRoundTime(timeMs);
    socket.emit('round_complete', {
      gameId,
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
      round: currentRound,
      timeMs,
      totalPieces: gameData.rounds[currentRound].pieces,
    });
    setPhase('round_complete');
  };

  const handleNextRound = () => {
    const nextRound = currentRound + 1;
    if (nextRound >= gameData.rounds.length) {
      log.info('All rounds complete, showing final results');
      setPhase('game_complete');
    } else {
      log.info('Advancing to next round', { nextRound });
      setCurrentRound(nextRound);
      setPhase('playing');
    }
  };

  const handlePiecePlaced = (placed, total) => {
    socket.emit('piece_placed', {
      gameId,
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
      round: currentRound,
      piecesPlaced: placed,
      totalPieces: total,
    });
  };

  const handleCancel = () => {
    log.info('Player cancelling game', { gameId });
    socket.emit('game_cancelled', {
      gameId,
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
    });
    navigate('/');
  };

  if (phase === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">LOADING GAME...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="error-screen">
        <h2 className="error-title">GAME OVER</h2>
        <p className="error-text">{error || 'Game not found'}</p>
        <button className="retro-btn" onClick={() => navigate('/')}>
          ← BACK HOME
        </button>
      </div>
    );
  }

  if (phase === 'join') {
    return <JoinScreen onJoin={handleJoin} error={error} gameData={gameData} />;
  }

  if (phase === 'lobby') {
    return (
      <Lobby
        gameId={gameId}
        players={players}
        playerInfo={playerInfo}
        gameData={gameData}
        onStart={handleStartGame}
      />
    );
  }

  if (phase === 'playing') {
    return (
      <Game
        gameData={gameData}
        playerInfo={playerInfo}
        currentRound={currentRound}
        opponents={opponents}
        onPiecePlaced={handlePiecePlaced}
        onRoundComplete={handleRoundComplete}
        onCancel={handleCancel}
      />
    );
  }

  if (phase === 'round_complete') {
    return (
      <RoundComplete
        gameData={gameData}
        currentRound={currentRound}
        timeMs={roundTime}
        totalRounds={gameData.rounds.length}
        onNext={handleNextRound}
      />
    );
  }

  if (phase === 'game_complete') {
    return (
      <GameComplete
        gameId={gameId}
        playerInfo={playerInfo}
        gameData={gameData}
        onHome={() => navigate('/')}
      />
    );
  }

  return null;
}
