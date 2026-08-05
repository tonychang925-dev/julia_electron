const { spawn } = require('child_process');
const { ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE_TTS = '/opt/miniconda3/bin/edge-tts';
const VOICE = 'zh-CN-XiaoxiaoNeural';

/**
 * TTSManager — wraps edge-tts CLI (Microsoft free TTS).
 * Spawns edge-tts → writes MP3 to temp file → returns bytes to renderer.
 */
function registerTtsIpc() {
  ipcMain.handle('tts:speak', async (_event, text) => {
    if (!text) return null;
    // Strip tags edge-tts will mispronounce
    const clean = text.replace(/\[.*?\]/g, '').trim();
    if (!clean) return null;

    const tmpFile = path.join(os.tmpdir(), `julia_tts_${Date.now()}.mp3`);

    return new Promise((resolve) => {
      const p = spawn(EDGE_TTS, [
        '--voice', VOICE,
        '--text', clean,
        '--write-media', tmpFile,
      ], { timeout: 15000 });

      p.on('close', (code) => {
        if (code === 0 && fs.existsSync(tmpFile)) {
          const data = fs.readFileSync(tmpFile);
          fs.unlinkSync(tmpFile);
          resolve(data.toString('base64'));
        } else {
          resolve(null);
        }
      });

      p.on('error', () => resolve(null));
    });
  });
}

module.exports = { registerTtsIpc };
