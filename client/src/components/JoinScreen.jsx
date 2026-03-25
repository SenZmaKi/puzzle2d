import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playButtonSound } from '../utils/sounds';
import { Swords, Gamepad2, ArrowLeft } from 'lucide-react';

export default function JoinScreen({ onJoin, error, gameData }) {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      playButtonSound();
      onJoin(name.trim());
    }
  };

  return (
    <div className="join-container">
      <div className="join-card">
        <button
          className="retro-btn secondary back-btn-inline"
          onClick={() => { playButtonSound(); navigate('/'); }}
        >
          <ArrowLeft size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          BACK
        </button>

        <div className="title-glow small">
          <h1 className="game-title small">
            <span className="title-puzzle">PUZZLE</span>
            <span className="title-2d">2D</span>
          </h1>
        </div>

        <div className="join-invite">
          <Gamepad2 size={28} color="var(--red-light)" />
          <p>You've been invited to a puzzle battle!</p>
          {gameData?.name && (
            <p className="join-game-name">{gameData.name}</p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Gamepad2 size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              ENTER YOUR NAME
            </label>
            <input
              type="text"
              className="retro-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Challenger name..."
              maxLength={20}
              autoFocus
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="retro-btn primary" disabled={!name.trim()}>
            <Swords size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            JOIN BATTLE
          </button>
        </form>
      </div>
    </div>
  );
}
