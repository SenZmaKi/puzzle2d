import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playButtonSound } from '../utils/sounds';
import {
  Copy, Check, Rocket, Users, Layers, Link as LinkIcon,
  Star, Gamepad2, Clock, ArrowLeft,
} from 'lucide-react';

export default function Lobby({ gameId, players, playerInfo, gameData, onStart }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const rounds = gameData?.rounds || [];

  const shareLink = `${window.location.origin}/game/${gameId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    playButtonSound();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
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

        {gameData?.name && (
          <p className="lobby-game-name">{gameData.name}</p>
        )}

        <div className="lobby-section">
          <h3 className="section-title">
            <LinkIcon size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            SHARE LINK
          </h3>
          <div className="share-row">
            <input
              className="retro-input share-input"
              value={shareLink}
              readOnly
              onClick={(e) => e.target.select()}
            />
            <button className="retro-btn small" onClick={copyLink}>
              {copied ? (
                <><Check size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} /> COPIED</>
              ) : (
                <><Copy size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} /> COPY</>
              )}
            </button>
          </div>
        </div>

        <div className="lobby-section">
          <h3 className="section-title">
            <Users size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            CHALLENGERS <span className="player-count">{players.length}</span>
          </h3>
          <div className="player-list">
            {players.map((p, i) => (
              <div
                key={p.playerId}
                className="player-row"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="player-icon">
                  {p.playerId === playerInfo.playerId ? (
                    <Star size={16} color="var(--gold)" />
                  ) : (
                    <Gamepad2 size={16} />
                  )}
                </span>
                <span className="player-name">{p.playerName}</span>
                {p.playerId === playerInfo.playerId && (
                  <span className="player-badge">YOU</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-section">
          <h3 className="section-title">
            <Layers size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            ROUNDS
          </h3>
          <div className="rounds-preview">
            {rounds.map((r, i) => (
              <div key={i} className="round-preview-card">
                <div className="round-num">R{r.round}</div>
                <div className="round-detail">{r.pieces} pieces</div>
                <div className="round-grid">{r.cols}×{r.rows}</div>
              </div>
            ))}
          </div>
        </div>

        {playerInfo.isCreator && (
          <button className="retro-btn primary large" onClick={() => { playButtonSound(); onStart(); }}>
            <Rocket size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
            START GAME
          </button>
        )}

        {!playerInfo.isCreator && (
          <div className="waiting-msg">
            <div className="waiting-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
            <p>
              <Clock size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
              Waiting for host to start...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
