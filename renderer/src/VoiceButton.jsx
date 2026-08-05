import React, { useState, useRef, useEffect } from 'react';
import VoiceLevel from './VoiceLevel';
import WebRTCVoice from './voice/WebRTCVoice';

const API = window.juliaAPI;

export default function VoiceButton({ onResult, disabled }) {
  const [level, setLevel] = useState(0);
  const [partialText, setPartialText] = useState('');
  const [state, setState] = useState('connecting');
  const cleanupRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (disabled) return;

    // WebRTC mic → Gateway (AEC on localhost)
    WebRTCVoice.connect().then((r) => { if (r?.connected) setState('live'); else setState('error'); }).catch(() => setState('error'));

    // Local STT transcript (mac_stt.swift — macOS native, no AEC needed)
    const unsub = API.onVoiceEvent((evt) => {
      const { type, data } = evt;
      if (type === 'audio.level') setLevel(data?.value || 0);
      else if (type === 'client.voice.partial') setPartialText(data?.text || '');
      else if (type === 'client.voice.final') {
        const text = data?.text?.trim();
        if (text && onResultRef.current) onResultRef.current(text);
        setPartialText('');
      }
    });
    API.voiceStart();

    cleanupRef.current = unsub;
    return () => { API.voiceStop(); WebRTCVoice.disconnect(); if (cleanupRef.current) cleanupRef.current(); };
  }, [disabled]);

  const labels = {
    connecting: { color: '#FFC107', text: 'Connecting...', icon: ' ' },
    live:       { color: '#4CAF50', text: partialText || 'Say something...', icon: ' ' },
    error:      { color: '#f44336', text: 'Mic unavailable', icon: ' ' },
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
