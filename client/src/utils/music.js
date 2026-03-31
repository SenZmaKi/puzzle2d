// Background music player — picks a random track from /sounds/*
let currentAudio = null;
let trackList = null;
let isPlaying = false;
let isMuted = (() => { try { return localStorage.getItem('puzzle2d_music_muted') === 'true'; } catch { return false; } })();
let volume = (() => { try { const v = localStorage.getItem('puzzle2d_music_vol'); return v !== null ? parseFloat(v) : 0.5; } catch { return 0.5; } })();
const BASE_BGM_VOLUME = 0.1;

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
  currentAudio.volume = isMuted ? 0 : volume * BASE_BGM_VOLUME;

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
  localStorage.setItem('puzzle2d_music_muted', isMuted);
  if (currentAudio) {
    currentAudio.volume = isMuted ? 0 : volume * BASE_BGM_VOLUME;
  }
  return isMuted;
}

export function setMusicMuted(muted) {
  isMuted = muted;
  localStorage.setItem('puzzle2d_music_muted', isMuted);
  if (currentAudio) {
    currentAudio.volume = isMuted ? 0 : volume * BASE_BGM_VOLUME;
  }
}

export function getMuted() {
  return isMuted;
}

export function getVolume() {
  return volume;
}

export function setBGMVolume(vol) {
  volume = Math.max(0, Math.min(1, vol));
  localStorage.setItem('puzzle2d_music_vol', volume);
  if (currentAudio && !isMuted) currentAudio.volume = volume * BASE_BGM_VOLUME;
}
