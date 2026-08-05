const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, systemPreferences } = require('electron');
const path = require('path');
const { createWebSocket } = require('./main/websocket');
const { registerIpcHandlers } = require('./main/ipc');
const { registerWebRTC } = require('./voice/webrtc_manager');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420, height: 680, minWidth: 360, minHeight: 520,
    titleBarStyle: 'hiddenInset', vibrancy: 'under-window', visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'main', 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    show: false,
  });

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  systemPreferences.askForMediaAccess('microphone');
});

app.whenReady().then(() => {
  createWindow();
  createWebSocket();
  registerIpcHandlers();
  registerWebRTC();

  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); }
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
