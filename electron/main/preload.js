const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload — exposes the Runtime Gateway Protocol v1 to the renderer.
 * Renderer knows events, not Julia.
 */
contextBridge.exposeInMainWorld('juliaAPI', {
  sendMessage: (text, sessionId) => ipcRenderer.send('julia:send', { text, sessionId: sessionId || '' }),

  subscribe: (callback) => {
    const handler = (_event, evt) => callback(evt);
    ipcRenderer.on('julia:event', handler);
    ipcRenderer.send('julia:subscribe-events');
    return () => ipcRenderer.removeListener('julia:event', handler);
  },

  checkHealth: () => ipcRenderer.invoke('julia:health'),

  // ── Edge TTS ──
  ttsSpeak: (text) => ipcRenderer.invoke('tts:speak', text),

  // ── Voice Capture (WebRTC + local STT) ──
  voiceStart: () => ipcRenderer.send('voice:start'),
  voiceStop: () => ipcRenderer.send('voice:stop'),
  onVoiceEvent: (callback) => {
    const handler = (_event, evt) => callback(evt);
    ipcRenderer.on('voice:event', handler);
    return () => ipcRenderer.removeListener('voice:event', handler);
  },
  // ── WebRTC ──
  rtcSignal: (offer) => ipcRenderer.invoke('rtc:signal', offer),
  onRTCState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('rtc:state', handler);
    return () => ipcRenderer.removeListener('rtc:state', handler);
  },
});
