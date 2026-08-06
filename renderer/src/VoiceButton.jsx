import React, { useState, useEffect, useRef } from 'react';
import VoiceLevel from './VoiceLevel';
import LiveKitVoice from './voice/LiveKitVoice';

export default function VoiceButton({ sessionId, disabled }) {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState('connecting');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (disabled) return;
    let disposed = false;

    LiveKitVoice.connect({
      onState: (s) => {
        if (!disposed) {
          if (s === 'connected' || s === 'live') { setErrorText(''); setState('live'); }
          else if (s === 'error') setState('error');
          else setState('connecting');
        }
      },
    }).catch((error) => {
      if (!disposed) {
        setErrorText(error?.message || 'Unknown');
        setState('error');
      }
    });

    return () => { disposed = true; LiveKitVoice.disconnect(); };
  }, [disabled]);

  const labels = {
    connecting: { color: '#FFC107', text: 'Connecting...', icon: ' ' },
    live:       { color: '#4CAF50', text: 'Ready', icon: ' ' },
    error:      { color: '#f44336', text: errorText || 'Voice connection failed', icon: '⚠️' },
  };
  const s = labels[state] || labels.connecting;

  const handleClick = () => {
    if (state === 'live') {
      LiveKitVoice.startAudio().catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <VoiceLevel level={level} active={state === 'live'} />
      <button onClick={handleClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ fontSize: '22px' }}>{s.icon}</span>
      </button>
      <div style={{ fontSize: '12px', fontWeight: 500, color: s.color, minWidth: '100px' }}>{s.text}</div>
    </div>
  );
}
