const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload — Runtime Gateway Protocol v1. Renderer knows events, not Julia.
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

  rtcSignal: (offer) => ipcRenderer.invoke('rtc:signal', offer),

  bindSession: (sessionId) => ipcRenderer.send('julia:session-bind', { sessionId }),

  voiceStart: () => ipcRenderer.send('voice:start'),
  voiceStop: () => ipcRenderer.send('voice:stop'),
  onVoiceEvent: (callback) => {
    const handler = (_event, evt) => callback(evt);
    ipcRenderer.on('voice:event', handler);
    return () => ipcRenderer.removeListener('voice:event', handler);
  },
});
