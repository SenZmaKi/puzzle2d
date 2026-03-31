import { createRNG, seededShuffle } from '../utils/seededRandom.js';
import createLogger from '../utils/logger.js';

const log = createLogger('PuzzleEngine');
const TAB_SIZE = 0.2;

function generateEdges(cols, rows, rng) {
  // hEdges[r][c] = edge between row r and row r+1 at column c
  const hEdges = [];
  for (let r = 0; r < rows - 1; r++) {
    hEdges[r] = [];
    for (let c = 0; c < cols; c++) {
      hEdges[r][c] = rng() > 0.5 ? 1 : -1;
    }
  }
  // vEdges[r][c] = edge between col c and col c+1 at row r
  const vEdges = [];
  for (let r = 0; r < rows; r++) {
    vEdges[r] = [];
    for (let c = 0; c < cols - 1; c++) {
      vEdges[r][c] = rng() > 0.5 ? 1 : -1;
    }
  }
  return { hEdges, vEdges };
}

// Build a jigsaw piece outline
// pw/ph = piece width/height, edges: top/right/bottom/left (0=flat, 1=tab, -1=blank)
function buildPiecePath(pw, ph, top, right, bottom, left) {
  const path = new Path2D();

  path.moveTo(0, 0);

  // Top edge (left to right)
  if (top === 0) {
    path.lineTo(pw, 0);
  } else {
    const d = top;
    const ty = -d * ph * TAB_SIZE;
    path.lineTo(pw * 0.34, 0);
    path.bezierCurveTo(pw * 0.34, ty * 0.2, pw * 0.4, ty, pw * 0.5, ty);
    path.bezierCurveTo(pw * 0.6, ty, pw * 0.66, ty * 0.2, pw * 0.66, 0);
    path.lineTo(pw, 0);
  }

  // Right edge (top to bottom)
  if (right === 0) {
    path.lineTo(pw, ph);
  } else {
    const d = right;
    const tx = pw + d * pw * TAB_SIZE;
    path.lineTo(pw, ph * 0.34);
    path.bezierCurveTo(pw + (tx - pw) * 0.2, ph * 0.34, tx, ph * 0.4, tx, ph * 0.5);
    path.bezierCurveTo(tx, ph * 0.6, pw + (tx - pw) * 0.2, ph * 0.66, pw, ph * 0.66);
    path.lineTo(pw, ph);
  }

  // Bottom edge (right to left)
  if (bottom === 0) {
    path.lineTo(0, ph);
  } else {
    const d = bottom;
    const ty = ph + d * ph * TAB_SIZE;
    path.lineTo(pw * 0.66, ph);
    path.bezierCurveTo(pw * 0.66, ph + (ty - ph) * 0.2, pw * 0.6, ty, pw * 0.5, ty);
    path.bezierCurveTo(pw * 0.4, ty, pw * 0.34, ph + (ty - ph) * 0.2, pw * 0.34, ph);
    path.lineTo(0, ph);
  }

  // Left edge (bottom to top)
  if (left === 0) {
    path.lineTo(0, 0);
  } else {
    const d = left;
    const tx = -d * pw * TAB_SIZE;
    path.lineTo(0, ph * 0.66);
    path.bezierCurveTo(tx * 0.2, ph * 0.66, tx, ph * 0.6, tx, ph * 0.5);
    path.bezierCurveTo(tx, ph * 0.4, tx * 0.2, ph * 0.34, 0, ph * 0.34);
    path.lineTo(0, 0);
  }

  path.closePath();
  return path;
}

export class PuzzleEngine {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.image = options.image;
    this.cols = options.cols;
    this.rows = options.rows;
    this.seed = options.seed;
    this.onPiecePlaced = options.onPiecePlaced || (() => {});
    this.onPieceConnected = options.onPieceConnected || (() => {});
    this.onComplete = options.onComplete || (() => {});

    this.pieces = [];
    this.groups = new Map(); // groupId -> Set of piece ids
    this.dragging = null;
    this.dragOffset = { x: 0, y: 0 };
    this.placedCount = 0;
    this.totalPieces = this.cols * this.rows;
    this.completed = false;
    this.dpr = window.devicePixelRatio || 1;

    // Timelapse replay data
    this.initialPositions = [];
    this.snapshots = [];

    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundTouchStart = this._onTouchStart.bind(this);
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);

    this._setupCanvas();
  }

  _setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  init() {
    const rng = createRNG(this.seed);
    log.info('Initializing puzzle', { cols: this.cols, rows: this.rows, seed: this.seed, totalPieces: this.totalPieces });

    // Calculate piece dimensions to fit in center board area
    const imgAspect = this.image.width / this.image.height;
    const boardMaxW = this.displayWidth * 0.48;
    const boardMaxH = this.displayHeight * 0.62;

    let fitW, fitH;
    if (boardMaxW / boardMaxH > imgAspect) {
      fitH = boardMaxH;
      fitW = fitH * imgAspect;
    } else {
      fitW = boardMaxW;
      fitH = fitW / imgAspect;
    }

    this.pieceW = fitW / this.cols;
    this.pieceH = fitH / this.rows;
    this.boardX = (this.displayWidth - fitW) / 2;
    this.boardY = (this.displayHeight - fitH) / 2;
    this.boardW = fitW;
    this.boardH = fitH;

    this.srcPieceW = this.image.width / this.cols;
    this.srcPieceH = this.image.height / this.rows;

    // Generate jigsaw edge types
    this.edges = generateEdges(this.cols, this.rows, rng);

    // Create pieces
    this.pieces = [];
    this.groups.clear();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;

        // Determine edge types for this piece
        const top = r === 0 ? 0 : -this.edges.hEdges[r - 1][c];
        const bottom = r === this.rows - 1 ? 0 : this.edges.hEdges[r][c];
        const left = c === 0 ? 0 : -this.edges.vEdges[r][c - 1];
        const right = c === this.cols - 1 ? 0 : this.edges.vEdges[r][c];

        const piece = {
          id: idx,
          col: c,
          row: r,
          x: 0,
          y: 0,
          targetX: this.boardX + c * this.pieceW,
          targetY: this.boardY + r * this.pieceH,
          top, right, bottom, left,
          path: buildPiecePath(this.pieceW, this.pieceH, top, right, bottom, left),
          placed: false,
          groupId: idx,
        };

        this.pieces.push(piece);
        this.groups.set(idx, new Set([idx]));
      }
    }

    // Scatter pieces randomly
    this._scatterPieces(rng);

    // Capture initial scatter positions for timelapse replay
    this.initialPositions = this.pieces.map(p => ({ id: p.id, x: p.x, y: p.y }));
    this.snapshots = [];

    // Input listeners
    this.canvas.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mousemove', this._boundMouseMove);
    window.addEventListener('mouseup', this._boundMouseUp);
    this.canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    window.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    window.addEventListener('touchend', this._boundTouchEnd);

    this.render();
    log.info('Puzzle ready', { boardArea: `${Math.round(this.boardW)}x${Math.round(this.boardH)}`, pieceSize: `${Math.round(this.pieceW)}x${Math.round(this.pieceH)}` });
  }

  _scatterPieces(rng) {
    const pw = this.pieceW;
    const ph = this.pieceH;
    const indices = Array.from({ length: this.totalPieces }, (_, i) => i);
    seededShuffle(indices, rng);

    // Scatter zones around the board
    const pad = pw * 0.3;
    const zones = [
      { x1: pad, x2: this.boardX - pw * 0.8, y1: pad, y2: this.displayHeight - ph - pad },
      { x1: this.boardX + this.boardW + pw * 0.2, x2: this.displayWidth - pw - pad, y1: pad, y2: this.displayHeight - ph - pad },
      { x1: this.boardX, x2: this.boardX + this.boardW - pw, y1: pad, y2: this.boardY - ph * 0.8 },
      { x1: this.boardX, x2: this.boardX + this.boardW - pw, y1: this.boardY + this.boardH + ph * 0.2, y2: this.displayHeight - ph - pad },
    ];

    const validZones = zones.filter(z => z.x2 > z.x1 + pw * 0.5 && z.y2 > z.y1 + ph * 0.5);
    if (validZones.length === 0) {
      validZones.push({ x1: pad, x2: this.displayWidth - pw - pad, y1: pad, y2: this.displayHeight - ph - pad });
    }

    // Minimum separation to avoid full overlap but allow some natural clustering
    const minSep = Math.max(pw, ph) * 0.6;
    const placed = [];

    indices.forEach((idx) => {
      const zone = validZones[placed.length % validZones.length];
      const zoneW = zone.x2 - zone.x1;
      const zoneH = zone.y2 - zone.y1;

      let bestX = zone.x1 + rng() * Math.max(0, zoneW - pw);
      let bestY = zone.y1 + rng() * Math.max(0, zoneH - ph);
      let bestMinDist = 0;

      // Try random positions; pick the one with best separation
      const attempts = Math.min(12, 4 + placed.length);
      for (let a = 0; a < attempts; a++) {
        // Pure random within zone with slight rotation-like jitter
        const px = zone.x1 + rng() * Math.max(0, zoneW - pw);
        const py = zone.y1 + rng() * Math.max(0, zoneH - ph);

        // Find min distance to already placed pieces in same zone
        let minDist = Infinity;
        for (const p of placed) {
          const dx = this.pieces[p].x - px;
          const dy = this.pieces[p].y - py;
          const d = dx * dx + dy * dy;
          if (d < minDist) minDist = d;
        }

        // Prefer positions that are at least minSep apart but still random
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestX = px;
          bestY = py;
        }

        // Good enough — don't over-optimize
        if (minDist > minSep * minSep * 2) break;
      }

      this.pieces[idx].x = bestX;
      this.pieces[idx].y = bestY;
      placed.push(idx);
    });
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  _hitTest(x, y) {
    // Check from top (last drawn) to bottom
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.placed) continue;
      const tab = Math.max(this.pieceW, this.pieceH) * TAB_SIZE;
      if (x >= p.x - tab && x <= p.x + this.pieceW + tab &&
          y >= p.y - tab && y <= p.y + this.pieceH + tab) {
        return p;
      }
    }
    return null;
  }

  _onMouseDown(e) {
    const pos = this._getPos(e);
    const piece = this._hitTest(pos.x, pos.y);
    if (piece) this._startDrag(piece, pos);
  }

  _onMouseMove(e) {
    if (this.dragging) {
      const pos = this._getPos(e);
      this._moveDrag(pos);
    }
  }

  _onMouseUp() {
    if (this.dragging) this._endDrag();
  }

  _onTouchStart(e) {
    e.preventDefault();
    const pos = this._getPos(e);
    const piece = this._hitTest(pos.x, pos.y);
    if (piece) this._startDrag(piece, pos);
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (this.dragging) this._moveDrag(this._getPos(e));
  }

  _onTouchEnd() {
    if (this.dragging) this._endDrag();
  }

  _startDrag(piece, pos) {
    this.dragging = piece;
    this.dragOffset = { x: pos.x - piece.x, y: pos.y - piece.y };
    this.canvas.style.cursor = 'grabbing';

    // Bring group to front (re-order in pieces array)
    const group = this.groups.get(piece.groupId);
    if (group) {
      const groupPieces = [];
      const otherPieces = [];
      for (const p of this.pieces) {
        if (group.has(p.id)) groupPieces.push(p);
        else otherPieces.push(p);
      }
      this.pieces = [...otherPieces, ...groupPieces];
    }

    this.render();
  }

  _moveDrag(pos) {
    if (!this.dragging) return;

    const dx = pos.x - this.dragOffset.x - this.dragging.x;
    const dy = pos.y - this.dragOffset.y - this.dragging.y;

    const group = this.groups.get(this.dragging.groupId);
    if (group) {
      for (const pid of group) {
        const p = this.pieces.find(pp => pp.id === pid);
        if (p) { p.x += dx; p.y += dy; }
      }
    }

    this.render();
  }

  _endDrag() {
    if (!this.dragging) return;
    const piece = this.dragging;
    this.dragging = null;
    this.canvas.style.cursor = 'default';

    const snapThreshold = this.pieceW * 0.3;
    const group = this.groups.get(piece.groupId);
    let snapped = false;

    if (group) {
      // Check if any piece in the group is near its correct board position
      for (const pid of group) {
        const p = this.pieces.find(pp => pp.id === pid);
        if (!p) continue;

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        if (Math.abs(dx) < snapThreshold && Math.abs(dy) < snapThreshold) {
          // Snap entire group to board
          for (const gpid of group) {
            const gp = this.pieces.find(pp => pp.id === gpid);
            if (gp) {
              gp.x = gp.targetX;
              gp.y = gp.targetY;
              if (!gp.placed) {
                gp.placed = true;
                this.placedCount++;
              }
            }
          }
          snapped = true;
          // Remove group — placed pieces are fully resolved
          this.groups.delete(piece.groupId);
          this._captureSnapshot();
          log.debug('Piece snapped to board', { placed: this.placedCount, total: this.totalPieces });
          this.onPiecePlaced(this._getProgress(), this.totalPieces);
          this.onPieceConnected();
          break;
        }
      }

      // If not snapped to board, check connections with neighbors
      if (!snapped) {
        this._checkConnections(piece);
      }
    }

    if (this.placedCount === this.totalPieces && !this.completed) {
      this.completed = true;
      log.info('Puzzle complete!', { totalPieces: this.totalPieces });
      this.onComplete();
    }

    this.render();
  }

  _checkConnections(piece) {
    const group = this.groups.get(piece.groupId);
    if (!group) return;

    const snapDist = this.pieceW * 0.3;
    let merged = false;

    for (const pid of [...group]) {
      const p = this.pieces.find(pp => pp.id === pid);
      if (!p) continue;

      const neighbors = [
        { dc: 0, dr: -1 },
        { dc: 1, dr: 0 },
        { dc: 0, dr: 1 },
        { dc: -1, dr: 0 },
      ];

      for (const { dc, dr } of neighbors) {
        const nc = p.col + dc;
        const nr = p.row + dr;
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;

        const neighbor = this.pieces.find(pp => pp.col === nc && pp.row === nr);
        if (!neighbor || neighbor.groupId === piece.groupId) continue;

        // Expected relative position
        const expectedDx = dc * this.pieceW;
        const expectedDy = dr * this.pieceH;
        const actualDx = neighbor.x - p.x;
        const actualDy = neighbor.y - p.y;

        if (Math.abs(actualDx - expectedDx) < snapDist &&
            Math.abs(actualDy - expectedDy) < snapDist) {
          this._mergeGroups(piece, p, neighbor);
          merged = true;
          this._captureSnapshot();
          this.onPieceConnected();
          this.onPiecePlaced(this._getProgress(), this.totalPieces);
          // After merge, check again for more connections
          this._checkConnections(piece);
          return;
        }
      }
    }
  }

  _mergeGroups(anchorPiece, sourcePiece, targetPiece) {
    const sourceGroup = this.groups.get(anchorPiece.groupId);
    const targetGroup = this.groups.get(targetPiece.groupId);
    if (!sourceGroup || !targetGroup || anchorPiece.groupId === targetPiece.groupId) return;

    // Snap target group to align with source
    const expectedDx = (targetPiece.col - sourcePiece.col) * this.pieceW;
    const expectedDy = (targetPiece.row - sourcePiece.row) * this.pieceH;
    const offsetX = sourcePiece.x + expectedDx - targetPiece.x;
    const offsetY = sourcePiece.y + expectedDy - targetPiece.y;

    const oldGroupId = targetPiece.groupId;

    for (const pid of targetGroup) {
      const p = this.pieces.find(pp => pp.id === pid);
      if (p) {
        p.x += offsetX;
        p.y += offsetY;
        p.groupId = anchorPiece.groupId;
        sourceGroup.add(pid);
      }
    }

    this.groups.delete(oldGroupId);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

    // Draw board area outline
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 50, 50, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(this.boardX, this.boardY, this.boardW, this.boardH);
    ctx.setLineDash([]);

    // Ghost grid
    ctx.strokeStyle = 'rgba(220, 50, 50, 0.08)';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(this.boardX, this.boardY + r * this.pieceH);
      ctx.lineTo(this.boardX + this.boardW, this.boardY + r * this.pieceH);
      ctx.stroke();
    }
    for (let c = 1; c < this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(this.boardX + c * this.pieceW, this.boardY);
      ctx.lineTo(this.boardX + c * this.pieceW, this.boardY + this.boardH);
      ctx.stroke();
    }
    ctx.restore();

    // Draw pieces (placed first, then unplaced, dragging last)
    const placed = [];
    const unplaced = [];
    for (const p of this.pieces) {
      if (p.placed) placed.push(p);
      else unplaced.push(p);
    }

    for (const p of placed) this._drawPiece(p);
    for (const p of unplaced) this._drawPiece(p);
  }

  _drawPiece(piece) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(piece.x, piece.y);

    // Shadow for unplaced pieces
    if (!piece.placed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      // Draw a filled shape for the shadow
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill(piece.path);
      ctx.shadowColor = 'transparent';
    }

    // Clip and draw image
    ctx.save();
    ctx.clip(piece.path);

    // Draw the full image offset so the correct portion shows through the clip
    const fullW = this.pieceW * this.cols;
    const fullH = this.pieceH * this.rows;
    ctx.drawImage(
      this.image,
      0, 0, this.image.width, this.image.height,
      -piece.col * this.pieceW, -piece.row * this.pieceH,
      fullW, fullH
    );
    ctx.restore();

    // Piece outline
    ctx.strokeStyle = piece.placed ? 'rgba(255,255,255,0.15)' : 'rgba(20, 5, 5, 0.6)';
    ctx.lineWidth = piece.placed ? 0.5 : 1.2;
    ctx.stroke(piece.path);

    // Subtle inner highlight for unplaced pieces
    if (!piece.placed) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke(piece.path);
    }

    ctx.restore();
  }

  // Animate all pieces to correct positions (for round-complete reveal)
  animateToComplete(duration = 1500) {
    return new Promise((resolve) => {
      const starts = this.pieces.map(p => ({ x: p.x, y: p.y }));
      const t0 = performance.now();

      const animate = (now) => {
        const t = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        this.pieces.forEach((p, i) => {
          p.x = starts[i].x + (p.targetX - starts[i].x) * ease;
          p.y = starts[i].y + (p.targetY - starts[i].y) * ease;
        });
        this.render();

        if (t < 1) requestAnimationFrame(animate);
        else {
          this.pieces.forEach(p => { p.x = p.targetX; p.y = p.targetY; p.placed = true; });
          this.render();
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  _getProgress() {
    return this.totalPieces - this.groups.size;
  }

  _captureSnapshot() {
    this.snapshots.push(
      this.pieces.map(p => ({ id: p.id, x: p.x, y: p.y, placed: p.placed }))
    );
  }

  _disableInput() {
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mouseup', this._boundMouseUp);
    this.canvas.removeEventListener('touchstart', this._boundTouchStart);
    window.removeEventListener('touchmove', this._boundTouchMove);
    window.removeEventListener('touchend', this._boundTouchEnd);
    this.canvas.style.cursor = 'default';
  }

  _enableInput() {
    this.canvas.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mousemove', this._boundMouseMove);
    window.addEventListener('mouseup', this._boundMouseUp);
    this.canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    window.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    window.addEventListener('touchend', this._boundTouchEnd);
  }

  // Replay the full puzzle assembly as a timelapse
  replayTimelapse(duration = 5000) {
    return new Promise((resolve) => {
      this._disableInput();

      const snapCount = this.snapshots.length;
      if (snapCount === 0) { resolve(); return; }

      // Phase 1: Scatter back to initial positions (600ms)
      const scatterDuration = 600;
      const currentPositions = this.pieces.map(p => ({ x: p.x, y: p.y }));
      const initialMap = new Map(this.initialPositions.map(ip => [ip.id, ip]));

      // Reset placed state for visual
      this.pieces.forEach(p => { p.placed = false; });

      const t0 = performance.now();
      const animateScatter = (now) => {
        const t = Math.min((now - t0) / scatterDuration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        this.pieces.forEach((p, i) => {
          const init = initialMap.get(p.id);
          p.x = currentPositions[i].x + (init.x - currentPositions[i].x) * ease;
          p.y = currentPositions[i].y + (init.y - currentPositions[i].y) * ease;
        });
        this.render();

        if (t < 1) {
          requestAnimationFrame(animateScatter);
        } else {
          // Phase 2: Replay snapshots
          this._animateSnapshots(duration, resolve);
        }
      };
      requestAnimationFrame(animateScatter);
    });
  }

  _animateSnapshots(totalDuration, resolve) {
    const snapCount = this.snapshots.length;
    // Time per transition between snapshots
    const transitionTime = totalDuration / snapCount;
    // Each transition: 70% animating, 30% hold
    const animFraction = 0.7;

    let currentSnap = 0;
    const initialMap = new Map(this.initialPositions.map(ip => [ip.id, ip]));

    const runTransition = () => {
      if (currentSnap >= snapCount) {
        // Done — restore final state
        this.pieces.forEach(p => {
          p.x = p.targetX;
          p.y = p.targetY;
          p.placed = true;
        });
        this.render();
        resolve();
        return;
      }

      const targetSnap = this.snapshots[currentSnap];
      const targetMap = new Map(targetSnap.map(s => [s.id, s]));

      // Capture where pieces are right now
      const from = this.pieces.map(p => ({ x: p.x, y: p.y }));
      const animDur = transitionTime * animFraction;
      const holdDur = transitionTime * (1 - animFraction);
      const t0 = performance.now();

      const animateStep = (now) => {
        const elapsed = now - t0;
        const t = Math.min(elapsed / animDur, 1);
        // Snappy ease-out
        const ease = 1 - Math.pow(1 - t, 4);

        this.pieces.forEach((p, i) => {
          const target = targetMap.get(p.id);
          p.x = from[i].x + (target.x - from[i].x) * ease;
          p.y = from[i].y + (target.y - from[i].y) * ease;
          p.placed = target.placed;
        });
        this.render();

        if (t < 1) {
          requestAnimationFrame(animateStep);
        } else {
          currentSnap++;
          // Brief hold before next transition
          setTimeout(runTransition, holdDur);
        }
      };
      requestAnimationFrame(animateStep);
    };

    runTransition();
  }

  destroy() {
    log.debug('Destroying puzzle engine');
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mouseup', this._boundMouseUp);
    this.canvas.removeEventListener('touchstart', this._boundTouchStart);
    window.removeEventListener('touchmove', this._boundTouchMove);
    window.removeEventListener('touchend', this._boundTouchEnd);
  }
}
