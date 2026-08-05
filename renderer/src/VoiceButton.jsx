import React, { useState, useEffect, useRef } from 'react';
import VoiceLevel from './VoiceLevel';
import WebRTCVoice from './voice/WebRTCVoice';

const API = window.juliaAPI;

export default function VoiceButton({ sessionId, onResult, disabled }) {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState('connecting');
  const [errorText, setErrorText] = useState('');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (disabled) return;
    let disposed = false;

    WebRTCVoice.connect(sessionId)
      .then(() => {
        if (!disposed) { setErrorText(''); setState('live'); }
        // Start local mic level monitor
        const stream = WebRTCVoice._stream;
        if (stream) {
          try {
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
              if (disposed) { ctx.close(); return; }
              analyser.getByteFrequencyData(data);
              const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length) / 255;
              setLevel(rms);
              requestAnimationFrame(tick);
            };
            tick();
          } catch {}
        }
      })
      .catch((error) => {
        console.error('[WebRTCVoice] connect failed:', error?.name, error?.message, error);
        if (!disposed) {
          WebRTCVoice.disconnect();
          setErrorText(`${error?.name || 'Error'}: ${error?.message || 'Unknown'}`);
          setState('error');
        }
      });

    const unsub = API.subscribe((evt) => {
      const { category, event, data } = evt;
      if (category === 'voice' && event === 'final') {
        const text = data?.text?.trim();
        if (text && onResultRef.current) onResultRef.current(text);
      }
    });

    return () => { disposed = true; WebRTCVoice.disconnect(); unsub(); };
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
