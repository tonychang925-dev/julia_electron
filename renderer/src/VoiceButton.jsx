import React, { useState } from 'react';
import LiveKitVoice from './voice/LiveKitVoice';

export default function VoiceButton() {
  const [state, setState] = useState('idle');

  const handleClick = async () => {
    if (state === 'live') return;
    setState('connecting');

    try {
      await LiveKitVoice.connect({
        onState: (s) => { if (s === 'connected' || s === 'live') setState('live'); },
      });
      // Must be called from click event — Chromium autoplay requirement
      await LiveKitVoice.startAudio();
    } catch (e) {
      setState('error');
    }
  };

  const s = {
    idle:   { color: '#4CAF50', text: 'Start Voice', icon: ' ' },
    connecting: { color: '#FFC107', text: 'Connecting...', icon: ' ' },
    live:   { color: '#4CAF50', text: 'Connected — listening for test phrase...', icon: ' ' },
    error:  { color: '#f44336', text: 'Connection failed', icon: '⚠️' },
  }[state];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <button
        onClick={handleClick}
        disabled={state === 'connecting'}
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          cursor: state === 'connecting' ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${s.color}`, background: 'rgba(255,255,255,0.06)',
          flexShrink: 0, opacity: state === 'connecting' ? 0.5 : 1,
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{s.icon}</span>
      </button>
      <div style={{ fontSize: '12px', fontWeight: 500, color: s.color, minWidth: '180px' }}>
        {s.text}
      </div>
    </div>
  );
}
