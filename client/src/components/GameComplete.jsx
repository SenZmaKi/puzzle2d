import React, { useEffect, useState } from 'react';
import { playButtonSound } from '../utils/sounds';
import { Home, Trophy, Timer, Star } from 'lucide-react';

function computeScore(timeMs, pieces) {
  if (timeMs <= 0) return 100;
  const decayMs = pieces * 7500;
  return Math.max(1, Math.round(100 * Math.exp(-timeMs / decayMs)));
}

export default function GameComplete({ gameId, playerInfo, gameData, onHome }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${gameId}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        const progress = data.progress || [];
        const rounds = gameData?.rounds || [];

        // Group progress by player and compute total score
        const playerScores = {};
        for (const entry of progress) {
          if (!entry.completed) continue;
          const roundConfig = rounds[entry.round];
          const pieces = roundConfig ? roundConfig.pieces : 25;
          const score = computeScore(entry.time_ms, pieces);

          if (!playerScores[entry.player_name]) {
            playerScores[entry.player_name] = { name: entry.player_name, totalScore: 0, totalTime: 0, roundsCompleted: 0 };
          }
          playerScores[entry.player_name].totalScore += score;
          playerScores[entry.player_name].totalTime += entry.time_ms;
          playerScores[entry.player_name].roundsCompleted++;
        }

        const sorted = Object.values(playerScores).sort((a, b) => b.totalScore - a.totalScore || a.totalTime - b.totalTime);
        setLeaderboard(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId, gameData]);

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="game-complete-container">
      <div className="confetti">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              '--x': `${Math.random() * 100}vw`,
              '--delay': `${Math.random() * 2}s`,
              '--duration': `${2 + Math.random() * 3}s`,
              '--color': ['#dc143c', '#ff6b6b', '#ffd700', '#ff4757', '#ffffff'][
                Math.floor(Math.random() * 5)
              ],
            }}
          />
        ))}
      </div>

      <div className="complete-content">
        <h1 className="complete-title">GAME OVER!</h1>
        <p className="complete-subtitle">Final Standings</p>

        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <div className="leaderboard">
            {leaderboard.map((entry, i) => (
              <div
                key={i}
                className={`leaderboard-row ${i === 0 ? 'gold' : ''}`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <span className="lb-rank">{medals[i] || `#${i + 1}`}</span>
                <span className="lb-name">{entry.name}</span>
                <span className="lb-score">
                  <Star size={12} style={{ verticalAlign: '-1px', marginRight: '2px' }} />
                  {entry.totalScore}
                </span>
                <span className="lb-rounds">{entry.roundsCompleted} rds</span>
                <span className="lb-time">
                  <Timer size={12} style={{ verticalAlign: '-1px', marginRight: '2px' }} />
                  {formatTime(entry.totalTime)}
                </span>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <p className="no-data">No results yet</p>
            )}
          </div>
        )}

        <button
          className="retro-btn primary large"
          onClick={() => { playButtonSound(); onHome(); }}
        >
          <Home size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
          BACK HOME
        </button>
      </div>
    </div>
  );
}
