const { ipcMain } = require('electron');
const { STTManager } = require('./stt_manager');
const stt = new STTManager();

function registerVoiceIpc() {
  ipcMain.on('voice:start', (event) => {
    const win = event.sender;
    stt.start({
      onPartial: (text) => win.send('voice:event', { type: 'client.voice.partial', data: { text } }),
      onFinal: (text) => {
        win.send('julia:voice-event', { type: 'client.voice.final', data: { text } });
        win.send('voice:event', { type: 'client.voice.final', data: { text } });
      },
      onLevel: (v) => win.send('voice:event', { type: 'audio.level', data: { value: v } }),
    });
  });
  ipcMain.on('voice:stop', () => stt.stop());
}

module.exports = { registerVoiceIpc };
