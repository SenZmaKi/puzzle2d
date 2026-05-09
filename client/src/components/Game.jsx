import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PuzzleEngine } from '../engine/PuzzleEngine';
import {
  playConnectSound,
  playSnapSound,
  playTimelapseSound,
  stopTimelapseSound,
  playPreviewSound,
  stopPreviewSound,
  playNukeReady,
  playNukeLaunch,
  playNukeWarning,
  stopNukeWarning,
  playNukeExplosion,
  playNukeHit,
  playNukeMiss,
} from '../utils/sounds';
import { Timer, Puzzle, X, Users, Layers, Rewind, Eye, Crosshair } from 'lucide-react';

const NUKE_CHARGE_TIERS = [30000, 60000, 90000, 120000];

export default function Game({
  gameData,
  playerInfo,
  currentRound,
  opponents,
  onPiecePlaced,
  onRoundComplete,
  onCancel,
  onNukeLaunch,
  incomingNuke,
  onNukeHandled,
  nukeResult,
  onNukeResultSeen,
  savedPieceState,
  savedTimerMs,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [placedCount, setPlacedCount] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [timer, setTimer] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const [nukeCharge, setNukeCharge] = useState(0);
  const [nukeReady, setNukeReady] = useState(false);
  const [nukeTargeting, setNukeTargeting] = useState('none');
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [nukeWarning, setNukeWarning] = useState(null);
  const [nukeLaunched, setNukeLaunched] = useState(false);
  const [nukeTargetsLoading, setNukeTargetsLoading] = useState(false);
  const [nukeTargets, setNukeTargets] = useState(null);
  const nukeChargeStartRef = useRef(null);
  const nukeReadySoundFiredRef = useRef(false);
  const nukeHandlingRef = useRef(false);
  const nukeRestoredRef = useRef(false);
  const nukesFiredRef = useRef(0);
  const [nukeChargeTime, setNukeChargeTime] = useState(NUKE_CHARGE_TIERS[0]);

  const roundConfig = gameData.rounds[currentRound];
  const imageSrc = gameData.images[currentRound];
  const opponentList = Object.entries(opponents).filter(([id]) => id !== playerInfo.playerId);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageLoaded(true);
      setTotalPieces(roundConfig.pieces);
      setPlacedCount(0);
      setTimer(0);

      if (canvasRef.current) {
        if (engineRef.current) engineRef.current.destroy();

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
            localStorage.setItem(
              `puzzle2d_pieces_${gameData.id}_r${currentRound}`,
              JSON.stringify(engine.getState())
            );
          },
          onPieceConnected: () => {
            playConnectSound();
            localStorage.setItem(
              `puzzle2d_pieces_${gameData.id}_r${currentRound}`,
              JSON.stringify(engine.getState())
            );
          },
          onComplete: () => {
            const elapsed = Date.now() - startTimeRef.current;
            if (timerRef.current) clearInterval(timerRef.current);
            setTimer(elapsed);
            setTimeout(async () => {
              setIsReplaying(true);
              playTimelapseSound();
              try {
                await engine.replayTimelapse(5000);
              } finally {
                stopTimelapseSound();
                setIsReplaying(false);
              }
              setTimeout(() => onRoundComplete(elapsed), 400);
            }, 600);
          },
        });

        engine.init();
        engineRef.current = engine;

        if (savedPieceState) {
          const restoredProgress = engine.restoreState(savedPieceState);
          setPlacedCount(restoredProgress);
          const elapsed = savedTimerMs || 0;
          startTimeRef.current = Date.now() - elapsed;
          setTimer(elapsed);
          timerRef.current = setInterval(() => {
            setTimer(Date.now() - startTimeRef.current);
          }, 100);
        } else {
          setIsPreviewMode(true);
          playPreviewSound();
          engine.playRoundPreview(4000, 1800).then(() => {
            stopPreviewSound();
            setIsPreviewMode(false);
            startTimeRef.current = Date.now();
            localStorage.setItem(
              `puzzle2d_timer_${gameData.id}_r${currentRound}`,
              String(startTimeRef.current)
            );
            localStorage.setItem(
              `puzzle2d_pieces_${gameData.id}_r${currentRound}`,
              JSON.stringify(engine.getState())
            );
            timerRef.current = setInterval(() => {
              setTimer(Date.now() - startTimeRef.current);
            }, 100);
          });
        }
      }
    };
    img.src = imageSrc;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopPreviewSound();
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [currentRound, imageSrc]);

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

  // Restore or reset nuke state on round change
  useEffect(() => {
    const nukeKey = `puzzle2d_nuke_${gameData.id}_r${currentRound}`;
    let saved = null;
    try {
      const s = localStorage.getItem(nukeKey);
      if (s) saved = JSON.parse(s);
    } catch {}

    if (saved) {
      nukesFiredRef.current = saved.nukesFired ?? 0;
      nukeReadySoundFiredRef.current = false;
      nukeRestoredRef.current = true;
      nukeChargeStartRef.current = saved.chargeStart;
      setNukeChargeTime(saved.nukeChargeTime ?? NUKE_CHARGE_TIERS[0]);
      // nukeCharge / nukeReady will be resolved by the timer effect
    } else {
      nukesFiredRef.current = 0;
      nukeReadySoundFiredRef.current = false;
      nukeRestoredRef.current = false;
      nukeChargeStartRef.current = null;
      setNukeChargeTime(NUKE_CHARGE_TIERS[0]);
      setNukeCharge(0);
      setNukeReady(false);
    }
  }, [currentRound]);

  // Nuke charge timer — starts when the round timer starts (after preview)
  useEffect(() => {
    if (!imageLoaded || isPreviewMode) return;

    const nukeKey = `puzzle2d_nuke_${gameData.id}_r${currentRound}`;

    if (nukeRestoredRef.current) {
      nukeRestoredRef.current = false;
      // Compute current charge from saved start time, set initial visual state
      const elapsed = nukeChargeStartRef.current ? Date.now() - nukeChargeStartRef.current : 0;
      const charge = Math.min(elapsed, nukeChargeTime);
      setNukeCharge(charge);
      if (charge >= nukeChargeTime) {
        setNukeReady(true);
        nukeReadySoundFiredRef.current = true;
      }
    } else {
      nukeChargeStartRef.current = Date.now();
      nukeReadySoundFiredRef.current = false;
      setNukeCharge(0);
      setNukeReady(false);
      localStorage.setItem(nukeKey, JSON.stringify({
        chargeStart: nukeChargeStartRef.current,
        nukesFired: nukesFiredRef.current,
        nukeChargeTime,
      }));
    }

    const interval = setInterval(() => {
      if (nukeHandlingRef.current || nukeChargeStartRef.current === null) return;
      const elapsed = Date.now() - nukeChargeStartRef.current;
      const charge = Math.min(elapsed, nukeChargeTime);
      setNukeCharge(charge);
      if (charge >= nukeChargeTime && !nukeReadySoundFiredRef.current) {
        nukeReadySoundFiredRef.current = true;
        setNukeReady(true);
        playNukeReady();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentRound, nukeChargeTime, imageLoaded, isPreviewMode]);

  // Handle incoming nuke
  useEffect(() => {
    if (!incomingNuke || nukeHandlingRef.current || !engineRef.current || engineRef.current.completed || isReplaying || isPreviewMode) return;
    nukeHandlingRef.current = true;

    const { fromPlayerId, fromPlayerName, sectionRow, sectionCol } = incomingNuke;

    if (nukeTargeting !== 'none') {
      setNukeTargeting('none');
      setSelectedOpponent(null);
      setNukeTargets(null);
    }

    playNukeWarning();
    setNukeWarning({ fromPlayerName });
    engineRef.current._disableInput();

    setTimeout(async () => {
      stopNukeWarning();
      setNukeWarning(null);

      playNukeExplosion();
      const count = await engineRef.current.nukeStrike(sectionRow, sectionCol);

      if (count > 0) {
        const newProgress = engineRef.current._getProgress();
        setPlacedCount(newProgress);
        onPiecePlaced(newProgress, totalPieces);
      }

      engineRef.current._enableInput();
      nukeHandlingRef.current = false;
      onNukeHandled({ fromPlayerId, hit: count > 0, piecesDestroyed: count });
    }, 1500);
  }, [incomingNuke]);

  // Handle nuke result from own launch
  useEffect(() => {
    if (!nukeResult) return;
    setNukeLaunched(false);
    if (nukeResult.hit) playNukeHit();
    else playNukeMiss();
    const t = setTimeout(() => onNukeResultSeen(), 3000);
    return () => clearTimeout(t);
  }, [nukeResult]);

  const handleNukeClick = useCallback(async () => {
    if (!nukeReady || isReplaying || nukeHandlingRef.current) return;
    setNukeTargeting('selectOpponent');
    setNukeTargetsLoading(true);
    setNukeTargets(null);
    if (engineRef.current) engineRef.current._disableInput();

    try {
      const res = await fetch(`/api/games/${gameData.id}`);
      const data = await res.json();
      const targets = (data.players ?? []).filter((p) => p.id !== playerInfo.playerId);
      setNukeTargets(targets);
    } catch {
      setNukeTargets(gameData.players.filter((p) => p.id !== playerInfo.playerId));
    } finally {
      setNukeTargetsLoading(false);
    }
  }, [nukeReady, isReplaying, gameData.id, gameData.players, playerInfo.playerId]);

  const handleSelectOpponent = useCallback((id, name) => {
    setSelectedOpponent({ id, name });
    setNukeTargeting('selectSection');
  }, []);

  const handleFireNuke = useCallback((sectionRow, sectionCol) => {
    if (!selectedOpponent) return;

    onNukeLaunch(selectedOpponent.id, sectionRow, sectionCol);
    playNukeLaunch();

    setNukeTargeting('none');
    setSelectedOpponent(null);
    setNukeTargets(null);
    setNukeReady(false);
    nukeReadySoundFiredRef.current = false;
    nukeChargeStartRef.current = Date.now();
    setNukeCharge(0);

    nukesFiredRef.current++;
    const nextTier = Math.min(nukesFiredRef.current, NUKE_CHARGE_TIERS.length - 1);
    const nextChargeTime = NUKE_CHARGE_TIERS[nextTier];
    setNukeChargeTime(nextChargeTime);

    localStorage.setItem(`puzzle2d_nuke_${gameData.id}_r${currentRound}`, JSON.stringify({
      chargeStart: nukeChargeStartRef.current,
      nukesFired: nukesFiredRef.current,
      nukeChargeTime: nextChargeTime,
    }));

    if (engineRef.current) engineRef.current._enableInput();

    setNukeLaunched(true);
    setTimeout(() => setNukeLaunched(false), 5000);
  }, [selectedOpponent, onNukeLaunch, gameData.id, currentRound]);

  const handleCancelTargeting = useCallback(() => {
    setNukeTargeting('none');
    setSelectedOpponent(null);
    setNukeTargets(null);
    setNukeTargetsLoading(false);
    if (engineRef.current) engineRef.current._enableInput();
  }, []);

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  const nukeChargePercent = Math.floor((nukeCharge / nukeChargeTime) * 100);
  const nukeSecondsLeft = Math.ceil((nukeChargeTime - nukeCharge) / 1000);

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
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${totalPieces > 0 ? (placedCount / totalPieces) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="hud-right">
          <button
            className={`nuke-btn ${nukeReady ? 'ready' : ''} ${nukeTargeting !== 'none' ? 'targeting' : ''}`}
            onClick={handleNukeClick}
            disabled={!nukeReady || isReplaying || nukeHandlingRef.current}
          >
            <span className="nuke-icon">☢</span>
            <span className="nuke-label">
              {nukeReady ? 'NUKE' : `${nukeSecondsLeft}s`}
            </span>
            {!nukeReady && (
              <div className="nuke-charge-bar">
                <div className="nuke-charge-fill" style={{ width: `${nukeChargePercent}%` }} />
              </div>
            )}
          </button>
          <button className="retro-btn small cancel" onClick={() => setShowQuitConfirm(true)}>
            <X size={14} style={{ verticalAlign: '-2px', marginRight: '3px' }} />
            QUIT
          </button>
        </div>
      </div>

      {/* Opponents sidebar — shows live progress; expands to nuke target selector on click */}
      {(opponentList.length > 0 || nukeTargeting !== 'none') && (
        <div className={`opponents-sidebar ${nukeTargeting === 'selectOpponent' ? 'nuke-select-mode' : ''}`}>
          {nukeTargeting === 'selectOpponent' ? (
            <>
              <div className="nuke-select-header">
                <Crosshair size={12} />
                <span>SELECT TARGET</span>
              </div>
              {nukeTargetsLoading ? (
                <div className="nuke-targets-loading">
                  <div className="loading-spinner" />
                  <span>LOADING...</span>
                </div>
              ) : nukeTargets?.length === 0 ? (
                <div className="nuke-targets-empty">No targets</div>
              ) : (
                nukeTargets?.map((target) => (
                  <div
                    key={target.id}
                    className="opponent-card nuke-targetable"
                    onClick={() => handleSelectOpponent(target.id, target.name)}
                  >
                    <div className="opponent-header">
                      <span className="opponent-name">{target.name}</span>
                    </div>
                    <div className="nuke-target-label">
                      <Crosshair size={10} />
                      TARGET
                    </div>
                  </div>
                ))
              )}
              <button className="nuke-cancel-btn" onClick={handleCancelTargeting}>
                CANCEL
              </button>
            </>
          ) : (
            <>
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
              {nukeTargeting !== 'none' && (
                <button className="nuke-cancel-btn" onClick={handleCancelTargeting}>
                  CANCEL
                </button>
              )}
            </>
          )}
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
        {isPreviewMode && (
          <div className="preview-overlay">
            <div className="preview-badge">
              <Eye size={14} className="preview-icon" />
              <span>PREVIEW</span>
            </div>
          </div>
        )}
        {isReplaying && (
          <div className="timelapse-overlay">
            <div className="timelapse-badge">
              <Rewind size={14} className="timelapse-icon" />
              <span>TIMELAPSE</span>
            </div>
            <div className="timelapse-progress">
              <div className="timelapse-bar" />
            </div>
          </div>
        )}

        {/* Nuke targeting grid overlay */}
        {nukeTargeting === 'selectSection' && selectedOpponent && engineRef.current && (
          <div className="nuke-target-overlay-wrapper">
            <div className="nuke-target-title">
              <Crosshair size={14} />
              TARGETING: {selectedOpponent.name}
            </div>
            <div
              className="nuke-target-grid"
              style={{
                position: 'absolute',
                left: engineRef.current.boardX,
                top: engineRef.current.boardY,
                width: engineRef.current.boardW,
                height: engineRef.current.boardH,
              }}
            >
              {Array.from({ length: 9 }, (_, i) => {
                const row = Math.floor(i / 3);
                const col = i % 3;
                return (
                  <div
                    key={i}
                    className="nuke-target-cell"
                    onClick={() => handleFireNuke(row, col)}
                  >
                    <Crosshair size={20} className="nuke-cell-crosshair" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Incoming nuke warning */}
        {nukeWarning && (
          <div className="nuke-warning-overlay">
            <div className="nuke-warning-icon">☢</div>
            <div className="nuke-warning-text">INCOMING NUKE!</div>
            <div className="nuke-warning-from">from {nukeWarning.fromPlayerName}</div>
          </div>
        )}

        {/* Nuke launched toast */}
        {nukeLaunched && !nukeResult && (
          <div className="nuke-launched-toast">
            <span className="nuke-launched-icon">☢</span>
            NUKE LAUNCHED!
          </div>
        )}

      </div>

      {/* Nuke result toast */}
      {nukeResult && (
        <div className={`nuke-result-toast ${nukeResult.hit ? 'hit' : 'miss'}`}>
          <span className="nuke-result-icon">{nukeResult.hit ? '💥' : '💨'}</span>
          <div className="nuke-result-body">
            <span className="nuke-result-title">
              {nukeResult.hit ? 'DIRECT HIT!' : 'MISS!'}
            </span>
            <span className="nuke-result-detail">
              {nukeResult.hit
                ? `${nukeResult.piecesDestroyed} piece${nukeResult.piecesDestroyed !== 1 ? 's' : ''} destroyed`
                : 'No pieces in target zone'}
            </span>
          </div>
        </div>
      )}

      {showQuitConfirm && (
        <div className="quit-confirm-overlay">
          <div className="quit-confirm-dialog">
            <X size={20} className="quit-confirm-icon" />
            <h3 className="quit-confirm-title">QUIT GAME?</h3>
            <p className="quit-confirm-body">Your progress will be lost.</p>
            <div className="quit-confirm-actions">
              <button className="retro-btn cancel" onClick={() => setShowQuitConfirm(false)}>
                KEEP PLAYING
              </button>
              <button className="retro-btn primary" onClick={onCancel}>
                QUIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
