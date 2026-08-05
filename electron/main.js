const { app, BrowserWindow, globalShortcut, session, systemPreferences } = require('electron');
const path = require('path');
const { createWebSocket } = require('./main/websocket');
const { registerIpcHandlers } = require('./main/ipc');
const { registerWebRTC } = require('./voice/webrtc_manager');

let mainWindow = null;

function isTrustedOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol === 'file:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch { return false; }
}

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

app.whenReady().then(async () => {
  // Permission handlers
  const ses = session.defaultSession;
  ses.setPermissionCheckHandler((_wc, permission, _origin, details) => {
    return permission === 'media' && details?.mediaType !== 'video';
  });
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media' && isTrustedOrigin(webContents.getURL()));
  });

  // Mic access
  const before = systemPreferences.getMediaAccessStatus('microphone');
  console.log('[MIC] status before:', before);
  const granted = before === 'granted' ? true : await systemPreferences.askForMediaAccess('microphone');
  console.log('[MIC] permission granted:', granted);

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
