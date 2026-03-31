import React, { useState, useRef, useCallback } from 'react';
import { getMuted, getVolume, setBGMVolume, setMusicMuted } from '../utils/music';
import { setSFXVolume, setSFXMuted, getSFXVolume, getSFXMuted } from '../utils/sounds';
import { Music, Volume2, VolumeOff, VolumeX } from 'lucide-react';

function MusicMutedIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 -0.91 122.88 122.88" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.6,22.7c-2.91-2.12-3.56-6.2-1.44-9.12s6.2-3.56,9.11-1.44L120.2,88.64c2.91,2.12,3.55,6.2,1.43,9.12
        c-2.12,2.91-6.2,3.56-9.11,1.44L7.6,22.7L7.6,22.7z M88.85,51.97V23.09l-28.42,8.16l-24.01-17.5L96.79,0v57.76L88.85,51.97
        L88.85,51.97z M36.33,57.46v45.08c0.03,0.32,0.05,0.64,0.05,0.96v0.01c0,7.76-8.14,15.46-18.19,17.2C8.15,122.44,0,117.55,0,109.79
        c0-7.76,8.15-15.46,18.19-17.19c3.78-0.65,7.29-0.36,10.21,0.66V51.68L36.33,57.46L36.33,57.46z M92.87,98.69
        c-2.77,2.77-6.71,4.88-11.09,5.63c-8.39,1.45-15.19-2.63-15.19-9.12c-0.01-4.03,2.62-8.04,6.62-10.84L92.87,98.69L92.87,98.69z" />
    </svg>
  );
}

function VolumeChannel({ icon: Icon, mutedIcon: MutedIcon, label, volume, muted, onVolumeChange, onToggleMute }) {
  const pct = Math.round(volume * 100);
  const ActiveIcon = muted || volume === 0 ? MutedIcon : Icon;

  return (
    <div className="vol-channel">
      <span className="vol-channel-label">{label}</span>
      <span className="volume-pct">{pct}%</span>
      <div className="volume-track-wrapper">
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={onVolumeChange}
          aria-label={`${label} volume`}
        />
      </div>
      <button
        className="vol-channel-btn"
        onClick={onToggleMute}
        title={muted ? `Unmute ${label}` : `Mute ${label}`}
        aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
      >
        <ActiveIcon size={16} />
      </button>
    </div>
  );
}

export default function MuteButton() {
  const [musicVol, setMusicVol] = useState(getVolume());
  const [musicMuted, setMusicMutedState] = useState(getMuted());
  const [sfxVol, setSfxVol] = useState(getSFXVolume());
  const [sfxMutedState, setSfxMutedState] = useState(getSFXMuted());
  const [showSlider, setShowSlider] = useState(false);
  const hideTimeout = useRef(null);

  const handleMusicVolume = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setMusicVol(v);
    setBGMVolume(v);
    if (v > 0 && musicMuted) { setMusicMuted(false); setMusicMutedState(false); }
    if (v === 0 && !musicMuted) { setMusicMuted(true); setMusicMutedState(true); }
  }, [musicMuted]);

  const handleSfxVolume = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setSfxVol(v);
    setSFXVolume(v);
    if (v > 0 && sfxMutedState) { setSFXMuted(false); setSfxMutedState(false); }
    if (v === 0 && !sfxMutedState) { setSFXMuted(true); setSfxMutedState(true); }
  }, [sfxMutedState]);

  const toggleMusic = () => {
    const m = !musicMuted;
    setMusicMuted(m);
    setMusicMutedState(m);
  };

  const toggleSfx = () => {
    const m = !sfxMutedState;
    setSFXMuted(m);
    setSfxMutedState(m);
  };

  const handleEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setShowSlider(true);
  };

  const handleLeave = () => {
    hideTimeout.current = setTimeout(() => setShowSlider(false), 300);
  };

  const allMuted = musicMuted && sfxMutedState;

  const toggleAll = () => {
    const mute = !allMuted;
    setMusicMuted(mute);
    setMusicMutedState(mute);
    setSFXMuted(mute);
    setSfxMutedState(mute);
  };

  const MainIcon = allMuted ? VolumeX : Volume2;

  return (
    <div
      className="volume-control"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className={`volume-panel ${showSlider ? 'visible' : ''}`}>
        <VolumeChannel
          icon={Music}
          mutedIcon={MusicMutedIcon}
          label="MUSIC"
          volume={musicVol}
          muted={musicMuted}
          onVolumeChange={handleMusicVolume}
          onToggleMute={toggleMusic}
        />
        <div className="vol-divider" />
        <VolumeChannel
          icon={Volume2}
          mutedIcon={VolumeOff}
          label="SFX"
          volume={sfxVol}
          muted={sfxMutedState}
          onVolumeChange={handleSfxVolume}
          onToggleMute={toggleSfx}
        />
      </div>
      <button
        className="mute-btn"
        onClick={toggleAll}
        title={allMuted ? 'Unmute all' : 'Mute all'}
        aria-label={allMuted ? 'Unmute all' : 'Mute all'}
      >
        <MainIcon size={18} />
      </button>
    </div>
  );
}
