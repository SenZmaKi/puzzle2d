import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { playButtonSound } from '../utils/sounds';
import {
  ArrowLeft, Users, Puzzle, ArrowRight, Plus,
  Calendar, Layers, Trophy,
} from 'lucide-react';

export default function Browse() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/games')
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="browse-container">
      <div className="browse-header">
        <Link to="/" className="back-link">
          <ArrowLeft size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          HOME
        </Link>
        <h1 className="browse-title">
          <Trophy size={20} style={{ verticalAlign: '-4px', marginRight: '8px' }} />
          BROWSE PUZZLES
        </h1>
        <p className="browse-subtitle">Join an existing game or spectate</p>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height: 'auto', padding: '3rem' }}>
          <div className="loading-spinner" />
          <p className="loading-text">LOADING...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="browse-empty">
          <Puzzle size={48} className="empty-icon-svg" />
          <p>No puzzles created yet!</p>
          <p className="browse-subtitle">Be the first to create one</p>
          <Link to="/" className="retro-btn primary">
            <Plus size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            CREATE PUZZLE
          </Link>
        </div>
      ) : (
        <div className="browse-grid">
          {games.map((game, i) => (
            <div
              key={game.id}
              className="browse-card"
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={() => { playButtonSound(); navigate(`/game/${game.id}`); }}
            >
              <div className="browse-card-header">
                <h3 className="browse-card-name">
                  <Puzzle size={14} style={{ verticalAlign: '-2px', marginRight: '6px', color: 'var(--red-primary)' }} />
                  {game.name}
                </h3>
                <span className="browse-card-date">
                  <Calendar size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                  {formatDate(game.createdAt)}
                </span>
              </div>
              <div className="browse-card-meta">
                <span className="browse-meta-item">
                  <Users size={13} />
                  {game.playerCount} player{game.playerCount !== 1 ? 's' : ''}
                </span>
                <span className="browse-meta-item">
                  <Layers size={13} />
                  {game.roundsConfig.length} round{game.roundsConfig.length !== 1 ? 's' : ''}
                </span>
                <span className="browse-meta-item">
                  <Puzzle size={13} />
                  {game.roundsConfig.map(r => r.pieces).join(' → ')} pcs
                </span>
              </div>
              <div className="browse-card-action">
                JOIN GAME
                <ArrowRight size={12} style={{ verticalAlign: '-1px', marginLeft: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
