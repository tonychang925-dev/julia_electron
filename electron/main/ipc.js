const { ipcMain } = require('electron');

/**
 * Register all IPC handlers between renderer and main process.
 *
 * Current handlers:
 *  - julia:send     → Forward chat message to Julia Core
 *  - julia:health   → Check if Julia Core server is running
 */
function registerIpcHandlers() {
  // julia:send is handled in websocket.js

  ipcMain.handle('app:version', () => {
    return '0.1.0';
  });

  ipcMain.handle('app:platform', () => {
    return process.platform;
  });
}

module.exports = { registerIpcHandlers };
