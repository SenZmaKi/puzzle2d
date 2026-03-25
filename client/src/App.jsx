import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Browse from './components/Browse';
import GamePage from './components/GamePage';
import MuteButton from './components/MuteButton';
import { startBGM } from './utils/music';

export default function App() {
  // Attempt BGM autoplay on load; fallback to first user interaction
  useEffect(() => {
    // Try immediately (works if browser allows autoplay)
    startBGM();

    const handleInteraction = () => {
      startBGM();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <div className="app">
      <div className="scanlines" />
      <div className="noise-overlay" />
      <MuteButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </div>
  );
}
