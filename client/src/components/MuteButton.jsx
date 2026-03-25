import React, { useState } from 'react';
import { toggleMute, getMuted } from '../utils/music';
import { Volume2, VolumeX } from 'lucide-react';

export default function MuteButton() {
  const [muted, setMuted] = useState(getMuted());

  const handleToggle = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  return (
    <button
      className="mute-btn"
      onClick={handleToggle}
      title={muted ? 'Unmute' : 'Mute'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
