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
      <button
        onClick={handleClick}
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${s.color}`, background: 'rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{s.icon}</span>
      </button>
      <div style={{ fontSize: '12px', fontWeight: 500, color: s.color, minWidth: '120px' }}>
        {s.text}
        {state === 'live' && <span style={{ display: 'block', fontSize: '10px', color: '#888' }}>click to enable audio</span>}
      </div>
    </div>
  );
}
