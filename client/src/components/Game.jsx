import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PuzzleEngine } from '../engine/PuzzleEngine';
import { playConnectSound, playSnapSound } from '../utils/sounds';
import { Timer, Puzzle, X, Users, Layers } from 'lucide-react';

export default function Game({
  gameData,
  playerInfo,
  currentRound,
  opponents,
  onPiecePlaced,
  onRoundComplete,
  onCancel,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [placedCount, setPlacedCount] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [timer, setTimer] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const roundConfig = gameData.rounds[currentRound];
  const imageSrc = gameData.images[currentRound];

  // Start timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Date.now() - startTimeRef.current);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRound]);

  // Load image and init engine
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageLoaded(true);
      setTotalPieces(roundConfig.pieces);
      setPlacedCount(0);

      if (canvasRef.current) {
        if (engineRef.current) engineRef.current.destroy();

        // Use round-specific seed: combine game seed with round index
        const roundSeed = gameData.seed + currentRound * 997;

        const engine = new PuzzleEngine(canvasRef.current, {
          image: img,
          cols: roundConfig.cols,
          rows: roundConfig.rows,
          seed: roundSeed,
          onPiecePlaced: (placed, total) => {
            setPlacedCount(placed);
            onPiecePlaced(placed, total);
            playSnapSound();
          },
          onPieceConnected: () => {
            playConnectSound();
          },
          onComplete: () => {
            const elapsed = Date.now() - startTimeRef.current;
            if (timerRef.current) clearInterval(timerRef.current);
            setTimer(elapsed);
            // Small delay for the final snap to feel satisfying
            setTimeout(() => onRoundComplete(elapsed), 600);
          },
        });

        engine.init();
        engineRef.current = engine;
      }
    };
    img.src = imageSrc;

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [currentRound, imageSrc]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && canvasRef.current) {
        engineRef.current._setupCanvas();
        engineRef.current.render();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  const opponentList = Object.entries(opponents).filter(
    ([id]) => id !== playerInfo.playerId
  );

  return (
    <div className="game-container">
      {/* Top HUD */}
      <div className="game-hud">
        <div className="hud-left">
          <div className="hud-round">
            <span className="hud-label">
              <Layers size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              ROUND
            </span>
            <span className="hud-value">{currentRound + 1}/{gameData.rounds.length}</span>
          </div>
          <div className="hud-pieces">
            <span className="hud-label">
              <Puzzle size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
              PIECES
            </span>
            <span className="hud-value">
              <span className="pieces-placed">{placedCount}</span>
              <span className="pieces-sep">/</span>
              <span className="pieces-total">{totalPieces}</span>
            </span>
          </div>
        </div>

        <div className="hud-center">
          <div className="hud-timer">
            <Timer size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            <span className="timer-value">{formatTime(timer)}</span>
          </div>
          {/* Progress bar */}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${totalPieces > 0 ? (placedCount / totalPieces) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="hud-right">
          <button className="retro-btn small cancel" onClick={onCancel}>
            <X size={14} style={{ verticalAlign: '-2px', marginRight: '3px' }} />
            QUIT
          </button>
        </div>
      </div>

      {/* Opponents sidebar */}
      {opponentList.length > 0 && (
        <div className="opponents-sidebar">
          <h4 className="opponents-title">
            <Users size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            OPPONENTS
          </h4>
          {opponentList.map(([id, data]) => (
            <div key={id} className="opponent-card">
              <div className="opponent-header">
                <span className="opponent-name">{data.playerName}</span>
                <span className="opponent-round">R{(data.round || 0) + 1}</span>
              </div>
              <div className="opponent-progress">
                <div className="opponent-bar">
                  <div
                    className="opponent-fill"
                    style={{
                      width: `${data.totalPieces > 0 ? (data.piecesPlaced / data.totalPieces) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="opponent-count">
                  {data.piecesPlaced || 0}/{data.totalPieces || '?'}
                </span>
              </div>
              {data.completed && (
                <span className="opponent-done">✓ {formatTime(data.timeMs)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Puzzle Canvas */}
      <div className="puzzle-area" ref={containerRef}>
        <canvas ref={canvasRef} className="puzzle-canvas" />
        {!imageLoaded && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading puzzle...</p>
          </div>
        )}
      </div>
    </div>
  );
}
