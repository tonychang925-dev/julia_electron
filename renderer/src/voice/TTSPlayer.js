/**
 * TTSPlayer — voice output via Microsoft Edge TTS (free, zh-CN-XiaoxiaoNeural).
 * Main process spawns edge-tts CLI → returns base64 MP3 → renderer plays via Audio.
 * Client owns audio playback. Core never touches media bytes.
 */
const API = window.juliaAPI;
const TTSPlayer = {
  _audio: null,

  async speak(text) {
    if (!text) return;
    try {
      const b64 = await API.ttsSpeak(text);
      if (!b64) return;

      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      if (this._audio) { this._audio.pause(); URL.revokeObjectURL(this._audio.src); }
      this._audio = new Audio(url);
      this._audio.onended = () => URL.revokeObjectURL(url);
      this._audio.onerror = () => URL.revokeObjectURL(url);
      await this._audio.play();
    } catch {}
  },

  cancel() {
    if (this._audio) { this._audio.pause(); URL.revokeObjectURL(this._audio.src); this._audio = null; }
  },
};

export default TTSPlayer;
