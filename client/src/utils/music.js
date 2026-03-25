// Background music player — picks a random track from /sounds/*
let currentAudio = null;
let trackList = null;
let isPlaying = false;
let isMuted = (() => { try { return localStorage.getItem('puzzle2d_muted') === 'true'; } catch { return false; } })();
let volume = 0.05;

async function fetchTrackList() {
  if (trackList) return trackList;
  try {
    const res = await fetch('/api/sounds');
    if (res.ok) {
      trackList = await res.json();
    } else {
      trackList = [];
    }
  } catch {
    trackList = [];
  }
  return trackList;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function startBGM() {
  if (isPlaying) return;
  const tracks = await fetchTrackList();
  if (tracks.length === 0) return;

  isPlaying = true;
  playTrack(pickRandom(tracks), tracks);
}

function playTrack(track, tracks) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentAudio = new Audio(`/sounds/${track}`);
  currentAudio.volume = isMuted ? 0 : volume;

  currentAudio.addEventListener('ended', () => {
    if (!isPlaying) return;
    const remaining = tracks.filter((t) => t !== track);
    const next = remaining.length > 0 ? pickRandom(remaining) : pickRandom(tracks);
    playTrack(next, tracks);
  });

  currentAudio.play().catch(() => {
    isPlaying = false;
  });
}

export function stopBGM() {
  isPlaying = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('puzzle2d_muted', isMuted);
  if (currentAudio) {
    currentAudio.volume = isMuted ? 0 : volume;
  }
  return isMuted;
}

export function getMuted() {
  return isMuted;
}

export function setBGMVolume(vol) {
  volume = Math.max(0, Math.min(1, vol));
  if (currentAudio && !isMuted) currentAudio.volume = volume;
}
