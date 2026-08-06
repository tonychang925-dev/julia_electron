import React, { useState, useEffect, useRef } from 'react';
import VoiceLevel from './VoiceLevel';
import VoiceEngineClient from './voice/VoiceEngineClient';

export default function VoiceButton({ sessionId, disabled }) {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState('disconnected');
  const [transcript, setTranscript] = useState('');
  const [errorText, setErrorText] = useState('');
  const onTranscriptRef = useRef(null);

  useEffect(() => {
    if (disabled) return;
    let disposed = false;

    VoiceEngineClient.connect({
      onState: (s) => {
        if (disposed) return;
        if (s === 'connected' || s === 'listening') { setState('listening'); setErrorText(''); }
        else if (s === 'speaking') setState('speaking');
        else if (s === 'error') { setState('error'); setErrorText('Connection failed'); }
        else if (s === 'disconnected') setState('disconnected');
      },
      onTranscript: (text, isFinal) => {
        if (disposed) return;
        if (isFinal) { setTranscript(''); if (onTranscriptRef.current) onTranscriptRef.current(text); }
        else setTranscript(text);
      },
      onAudioLevel: (rms) => {
        if (!disposed) setLevel(rms);
      },
    }).catch((e) => {
      if (!disposed) { setErrorText(e?.message || 'Unknown'); setState('error'); }
    });

    return () => { disposed = true; VoiceEngineClient.disconnect(); };
  }, [disabled]);

  const labels = {
    disconnected: { color: '#888', text: 'Start Voice', icon: ' ' },
    connecting: { color: '#FFC107', text: 'Connecting...', icon: ' ' },
    listening: { color: '#4CAF50', text: transcript || 'Listening...', icon: ' ' },
    speaking: { color: '#2196F3', text: 'Julia speaking...', icon: ' ' },
    error: { color: '#f44336', text: errorText || 'Error', icon: '⚠️' },
  };
  const s = labels[state] || labels.connecting;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <VoiceLevel level={level} active={state === 'listening' || state === 'speaking'} />
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        cursor: state === 'disconnected' ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${s.color}`, background: 'rgba(255,255,255,0.06)',
        flexShrink: 0, opacity: state === 'connecting' ? 0.5 : 1,
      }}
      onClick={() => { if (state === 'disconnected') { setState('connecting'); VoiceEngineClient.connect({ onState: (s) => { if (s === 'listening') setState('listening'); if (s === 'error') setState('error'); }, onTranscript: (t) => setTranscript(t || ''), onAudioLevel: (r) => setLevel(r) }).catch(() => setState('error')); } }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{s.icon}</span>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: s.color, minWidth: '180px' }}>
        {s.text}
        {state === 'listening' && <span style={{ display: 'block', fontSize: '10px', color: '#888', marginTop: '2px' }}>say something...</span>}
      </div>
    </div>
  );
}
