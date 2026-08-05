const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script — exposes a safe, minimal API to the renderer process.
 * The renderer never has direct access to Node.js or Electron internals.
 */
contextBridge.exposeInMainWorld('juliaAPI', {
  // Send a message to Julia Core (via main process)
  sendMessage: (text) => ipcRenderer.send('julia:send', { text }),

  // Listen for Julia's streaming response
  onResponse: (callback) => {
    ipcRenderer.on('julia:response', (_event, data) => callback(data));
  },

  // Listen for errors
  onError: (callback) => {
    ipcRenderer.on('julia:error', (_event, data) => callback(data));
  },

  // Listen for status updates (thinking, processing, done)
  onStatus: (callback) => {
    ipcRenderer.on('julia:status', (_event, data) => callback(data));
  },

  // Check Julia Core server health
  checkHealth: () => ipcRenderer.invoke('julia:health'),

  // Remove all listeners (cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
