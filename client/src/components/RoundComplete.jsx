import React, { useEffect, useState, useRef } from 'react';
import { playRoundCompleteSound, playButtonSound } from '../utils/sounds';
import { Play, Trophy, Timer, Puzzle, Layers, Star, Clock } from 'lucide-react';

// Score: 100 for instant, decays exponentially based on time and piece count
function computeScore(timeMs, pieces) {
  if (timeMs <= 0) return 100;
  const decayMs = pieces * 7500; // ~7.5 seconds per piece as baseline
  return Math.max(1, Math.round(100 * Math.exp(-timeMs / decayMs)));
}

export default function RoundComplete({ gameData, currentRound, timeMs, totalRounds, onNext }) {
  const [showImage, setShowImage] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const imgRef = useRef(null);

  const isLastRound = currentRound >= totalRounds - 1;
  const pieces = gameData.rounds[currentRound].pieces;
  const score = computeScore(timeMs, pieces);

  useEffect(() => {
    playRoundCompleteSound();

    // Staggered reveal
    setTimeout(() => setShowImage(true), 300);
    setTimeout(() => setShowStats(true), 1200);
    setTimeout(() => setShowButton(true), 2000);
  }, []);

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="round-complete-container">
      <div className="confetti">
        {Array.from({ length: 30 }).map((_, i) => (
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

      <div className="round-complete-content">
        <h2 className={`round-complete-title ${showImage ? 'visible' : ''}`}>
          {isLastRound ? '🏆 ALL ROUNDS COMPLETE!' : `✨ ROUND ${currentRound + 1} CLEAR!`}
        </h2>

        <div className={`round-image-reveal ${showImage ? 'visible' : ''}`}>
          <div className="image-frame">
            <img
              ref={imgRef}
              src={gameData.images[currentRound]}
              alt="Completed puzzle"
              className="completed-image"
            />
          </div>
        </div>

        <div className={`round-stats ${showStats ? 'visible' : ''}`}>
          <div className="stat-card">
            <span className="stat-label">
              <Timer size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              TIME
            </span>
            <span className="stat-value">{formatTime(timeMs)}</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-label">
              <Star size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              SCORE
            </span>
            <span className="stat-value stat-score">{score}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">
              <Puzzle size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              PIECES
            </span>
            <span className="stat-value">{pieces}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">
              <Layers size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              ROUND
            </span>
            <span className="stat-value">{currentRound + 1}/{totalRounds}</span>
          </div>
        </div>

        {showButton && (
          <div className="next-round-area">
            <button
              className="retro-btn primary large pulse"
              onClick={() => { playButtonSound(); onNext(); }}
            >
              {isLastRound ? (
                <><Trophy size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} /> VIEW RESULTS</>
              ) : (
                <><Play size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} /> NEXT ROUND</>
              )}
            </button>
            {!isLastRound && (
              <p className="wait-opponents-hint">
                <Clock size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                <em>Wait for opponents to finish</em>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
