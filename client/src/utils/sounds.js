// Web Audio API sound effects - no external files needed
let audioCtx = null;
let masterGain = null;
let sfxVolume = (() => { try { const v = localStorage.getItem('puzzle2d_sfx_vol'); return v !== null ? parseFloat(v) : 0.5; } catch { return 0.5; } })();
let sfxMuted = (() => { try { return localStorage.getItem('puzzle2d_sfx_muted') === 'true'; } catch { return false; } })();

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = sfxMuted ? 0 : sfxVolume;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getMasterGain() {
  getAudioContext();
  return masterGain;
}

export function setSFXVolume(vol) {
  sfxVolume = Math.max(0, Math.min(1, vol));
  localStorage.setItem('puzzle2d_sfx_vol', sfxVolume);
  if (masterGain) masterGain.gain.value = sfxMuted ? 0 : sfxVolume;
}

export function getSFXVolume() {
  return sfxVolume;
}

export function setSFXMuted(muted) {
  sfxMuted = muted;
  localStorage.setItem('puzzle2d_sfx_muted', sfxMuted);
  if (masterGain) masterGain.gain.value = sfxMuted ? 0 : sfxVolume;
}

export function getSFXMuted() {
  return sfxMuted;
}

export function playSnapSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(getMasterGain());

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playConnectSound() {
  const ctx = getAudioContext();

  // Two-tone "click-pop"
  [0, 0.06].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());

    osc.type = 'square';
    const freq = i === 0 ? 523 : 784;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.08);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.08);
  });
}

export function playRoundCompleteSound() {
  const ctx = getAudioContext();
  const notes = [523, 659, 784, 1047, 784, 1047];
  const duration = 0.12;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());

    osc.type = i < 4 ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * duration);

    gain.gain.setValueAtTime(0.12, ctx.currentTime + i * duration);
    gain.gain.linearRampToValueAtTime(
      i === notes.length - 1 ? 0.15 : 0.01,
      ctx.currentTime + (i + 1) * duration
    );
    if (i === notes.length - 1) {
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i + 2) * duration);
    }

    osc.start(ctx.currentTime + i * duration);
    osc.stop(ctx.currentTime + (i + 2) * duration);
  });
}

export function playButtonSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(getMasterGain());

  osc.type = 'square';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

export function playErrorSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(getMasterGain());

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

// Timelapse replay sound — fast-forward whirring + rhythmic ticks
let timelapseNodes = null;

export function playTimelapseSound() {
  const ctx = getAudioContext();
  const nodes = [];

  // Underlying rising hum
  const humOsc = ctx.createOscillator();
  const humGain = ctx.createGain();
  humOsc.connect(humGain);
  humGain.connect(getMasterGain());
  humOsc.type = 'sawtooth';
  humOsc.frequency.setValueAtTime(80, ctx.currentTime);
  humOsc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 5);
  humGain.gain.setValueAtTime(0.04, ctx.currentTime);
  humGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.5);
  humGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 5);
  humOsc.start(ctx.currentTime);
  humOsc.stop(ctx.currentTime + 5.5);
  nodes.push(humOsc, humGain);

  // Rapid ticking that accelerates
  const tickCount = 40;
  for (let i = 0; i < tickCount; i++) {
    // Accelerating distribution: more ticks toward the end
    const t = (i / tickCount);
    const time = t * t * 4.8;
    const tickOsc = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tickOsc.connect(tickGain);
    tickGain.connect(getMasterGain());
    tickOsc.type = 'square';
    const freq = 600 + (i / tickCount) * 800;
    tickOsc.frequency.setValueAtTime(freq, ctx.currentTime + time);
    tickGain.gain.setValueAtTime(0.06 + (i / tickCount) * 0.04, ctx.currentTime + time);
    tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.04);
    tickOsc.start(ctx.currentTime + time);
    tickOsc.stop(ctx.currentTime + time + 0.05);
    nodes.push(tickOsc, tickGain);
  }

  // Final "whoosh" at end
  const whooshOsc = ctx.createOscillator();
  const whooshGain = ctx.createGain();
  whooshOsc.connect(whooshGain);
  whooshGain.connect(getMasterGain());
  whooshOsc.type = 'sawtooth';
  whooshOsc.frequency.setValueAtTime(300, ctx.currentTime + 4.6);
  whooshOsc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 5.0);
  whooshOsc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 5.3);
  whooshGain.gain.setValueAtTime(0.0, ctx.currentTime + 4.6);
  whooshGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 4.9);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5.4);
  whooshOsc.start(ctx.currentTime + 4.6);
  whooshOsc.stop(ctx.currentTime + 5.5);
  nodes.push(whooshOsc, whooshGain);

  timelapseNodes = nodes;
}

export function stopTimelapseSound() {
  if (timelapseNodes) {
    const ctx = getAudioContext();
    timelapseNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode) node.stop(ctx.currentTime + 0.05);
        if (node instanceof GainNode) node.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      } catch (e) { /* already stopped */ }
    });
    timelapseNodes = null;
  }
}
