import React, { useState, useEffect } from 'react';
import VoiceLevel from './VoiceLevel';
import WebRTCVoice from './voice/WebRTCVoice';

export default function VoiceButton({ sessionId, disabled }) {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState('connecting');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (disabled) return;
    let disposed = false;

    WebRTCVoice.connect(sessionId)
      .then(() => { if (!disposed) { setErrorText(''); setState('live'); } })
      .catch((error) => {
        console.error('[WebRTCVoice] connect failed:', error?.name, error?.message, error);
        if (!disposed) {
          WebRTCVoice.disconnect();
          setErrorText(`${error?.name || 'Error'}: ${error?.message || 'Unknown'}`);
          setState('error');
        }
      });

    return () => { disposed = true; WebRTCVoice.disconnect(); };
  }, [disabled, sessionId]);

  const labels = {
    connecting: { color: '#FFC107', text: 'Connecting...', icon: ' ' },
    live:       { color: '#4CAF50', text: 'Ready', icon: ' ' },
    error:      { color: '#f44336', text: errorText || 'Voice connection failed', icon: '⚠️' },
  };
  const s = labels[state] || labels.connecting;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <VoiceLevel level={level} active={state === 'live'} />
      <span style={{ fontSize: '22px' }}>{s.icon}</span>
      <div style={{ fontSize: '12px', fontWeight: 500, color: s.color, minWidth: '100px' }}>{s.text}</div>
    </div>
  );
}
