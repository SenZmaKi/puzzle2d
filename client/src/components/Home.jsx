import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUNDS } from '@shared/constants.js';
import { playButtonSound } from '../utils/sounds';
import createLogger from '../utils/logger';
import {
  Play, Puzzle, Plus, Trash2, Upload, Image as ImageIcon,
  Users, Gamepad2, Sparkles, Search,
} from 'lucide-react';

const log = createLogger('Home');

function autoGrid(pieces) {
  const sqrt = Math.sqrt(pieces);
  for (let r = Math.round(sqrt); r >= 1; r--) {
    if (pieces % r === 0) {
      return { cols: pieces / r, rows: r };
    }
  }
  return { cols: pieces, rows: 1 };
}

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [gameName, setGameName] = useState('');
  const [rounds, setRounds] = useState(
    ROUNDS.map((r) => ({ ...r }))
  );
  // Per-round images: array of { file, preview } or null
  const [roundImages, setRoundImages] = useState(ROUNDS.map(() => null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRefs = useRef([]);
  const navigate = useNavigate();

  const numRounds = rounds.length;

  const updateRoundPieces = (index, newPieces) => {
    const val = Math.max(4, Math.min(100, parseInt(newPieces) || 4));
    const { cols, rows } = autoGrid(val);
    setRounds((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], pieces: val, cols, rows };
      return next;
    });
  };

  const addRound = () => {
    const lastPieces = rounds[rounds.length - 1]?.pieces || 15;
    const newPieces = lastPieces + 10;
    const { cols, rows } = autoGrid(newPieces);
    setRounds((prev) => [...prev, { round: prev.length + 1, pieces: newPieces, cols, rows }]);
    setRoundImages((prev) => [...prev, null]);
  };

  const removeRound = (index) => {
    if (rounds.length <= 1) return;
    setRounds((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, round: i + 1 })));
    setRoundImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImagePick = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRoundImages((prev) => {
      const next = [...prev];
      next[index] = { file, preview: URL.createObjectURL(file) };
      return next;
    });
    setError('');
  };

  const allImagesSelected = roundImages.every((img) => img !== null);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Enter your name, challenger!');
      return;
    }
    if (!gameName.trim()) {
      setError('Give your puzzle a name!');
      return;
    }
    if (!allImagesSelected) {
      setError(`Select an image for each round!`);
      return;
    }

    playButtonSound();
    setLoading(true);
    setError('');

    try {
      log.info('Creating game', { gameName: gameName.trim(), playerName: playerName.trim(), rounds: rounds.length });
      const formData = new FormData();
      roundImages.forEach((img) => formData.append('images', img.file));
      formData.append('playerName', playerName.trim());
      formData.append('gameName', gameName.trim());
      formData.append('roundsConfig', JSON.stringify(rounds));

      const res = await fetch('/api/games', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create game');

      log.info('Game created', { gameId: data.gameId });
      localStorage.setItem(`puzzle2d_player_${data.gameId}`, JSON.stringify({
        playerId: data.playerId,
        playerName: data.playerName,
        isCreator: true,
      }));

      navigate(`/game/${data.gameId}`);
    } catch (err) {
      log.error('Game creation failed', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="title-glow">
          <h1 className="game-title">
            <span className="title-puzzle">PUZZLE</span>
            <span className="title-2d">2D</span>
          </h1>
        </div>
        <p className="subtitle">
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
          {' '}RETRO JIGSAW BATTLE{' '}
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
        </p>
      </div>

      <div className="home-form">
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">
              <Gamepad2 size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              YOUR NAME
            </label>
            <input
              type="text"
              className="retro-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Challenger name..."
              maxLength={20}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">
              <Puzzle size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              PUZZLE NAME
            </label>
            <input
              type="text"
              className="retro-input"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="My Epic Puzzle..."
              maxLength={60}
            />
          </div>
        </div>

        {/* Per-round config with image picker */}
        <div className="form-group">
          <label className="form-label">
            <ImageIcon size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            ROUNDS & IMAGES
          </label>
          <div className="rounds-config">
            {rounds.map((r, i) => (
              <div key={i} className="round-config-row">
                <span className="round-config-label">R{i + 1}</span>
                <input
                  type="number"
                  className="retro-input round-input"
                  value={r.pieces}
                  min={4}
                  max={100}
                  onChange={(e) => updateRoundPieces(i, e.target.value)}
                />
                <span className="round-config-grid">{r.cols}×{r.rows}</span>

                {/* Per-round image picker */}
                <div
                  className={`round-image-picker ${roundImages[i] ? 'has-image' : ''}`}
                  onClick={() => fileInputRefs.current[i]?.click()}
                >
                  {roundImages[i] ? (
                    <img src={roundImages[i].preview} alt={`R${i+1}`} className="round-image-thumb" />
                  ) : (
                    <Upload size={14} />
                  )}
                </div>
                <input
                  ref={(el) => (fileInputRefs.current[i] = el)}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImagePick(i, e)}
                  style={{ display: 'none' }}
                />

                {rounds.length > 1 && (
                  <button className="round-remove-btn" onClick={() => removeRound(i)} title="Remove round">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className="retro-btn small" onClick={addRound}>
              <Plus size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
              ADD ROUND
            </button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          className="retro-btn primary large"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading">CREATING...</span>
          ) : (
            <>
              <Play size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              CREATE GAME
            </>
          )}
        </button>
      </div>

      <div className="home-footer">
        <div className="pixel-divider" />
        <p className="footer-text">
          <Users size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          Share the link • Friends join • Race to solve!
        </p>
        <Link to="/browse" className="browse-link">
          <Search size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          BROWSE EXISTING GAMES
        </Link>
      </div>
    </div>
  );
}
