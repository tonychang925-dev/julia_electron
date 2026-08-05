const { spawn } = require('child_process');
const STT_BIN = '/Users/admin/Desktop/speech_lab/stt';

class STTManager {
  constructor() {
    this._process = null;
    this._buffer = '';
  }

  start({ onPartial, onFinal, onLevel } = {}) {
    if (this._process) return;
    this._buffer = '';

    this._process = spawn(STT_BIN, ['--lang','zh-CN','--auto-stop-ms','800'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._process.stdout.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (!text) return;
      const num = parseFloat(text);
      if (!isNaN(num) && num >= 0 && num <= 1) {
        if (onLevel) onLevel(num);
        return;
      }
      this._buffer += text;
      if (onPartial) onPartial(this._buffer);
    });

    this._process.on('close', () => {
      if (this._buffer.trim() && onFinal) onFinal(this._buffer.trim());
      this._process = null;
      this._buffer = '';
      // Continuous: auto-restart after TTS cooldown
      if (this._onPartial) setTimeout(() => this._spawn(), 2000);
    });

    this._process.stderr.on('data', () => {});
  }

  stop() {
    if (this._process) { this._process.kill('SIGKILL'); this._process = null; this._buffer = ''; }
  }
}

module.exports = { STTManager };
