/** Voice Engine Client — WSS to AutoDL HF speech-to-speech (OpenAI Realtime API).

 *  Protocol: JSON frames. Mic PCM16 → base64 → input_audio_buffer.append.
 *  Server → response.output_audio.delta → PCM16 decode → AudioContext playback.
 */

const VOICE_ENGINE_URL = 'ws://127.0.0.1:8765/v1/realtime';

const log = (tag, detail) => console.log(`[${tag}]`, detail || '');

const VoiceEngineClient = {
  _ws: null,
  _stream: null,
  _audioCtx: null,
  _state: 'disconnected',
  _onState: null,
  _nextPlayTime: 0,
  _outputSampleRate: 24000,

  async connect({ onState } = {}) {
    this._onState = onState;
    this._setState('connecting');
    log('VE_CONNECTING');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        video: false,
      });
      this._stream = stream;
      const settings = stream.getAudioTracks()[0].getSettings();
      log('VE_MIC', { sr: settings.sampleRate, aec: settings.echoCancellation });

      this._audioCtx = new AudioContext({ sampleRate: this._outputSampleRate });
      this._nextPlayTime = 0;

      this._ws = new WebSocket(VOICE_ENGINE_URL);

      this._ws.onopen = () => {
        this._setState('listening');
        log('VE_CONNECTED');
        this._startMicStream();
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          log('VE_RX', { type: msg.type, deltaBytes: msg.delta?.length || 0 });
          this._handleMessage(msg);
        } catch (e) {
          log('VE_PARSE_ERROR', String(event.data).slice(0, 200));
        }
      };

      this._ws.onclose = () => { this._setState('disconnected'); log('VE_DISCONNECTED'); this._cleanup(); };
      this._ws.onerror = (e) => { log('VE_SOCKET_ERROR', e?.message || 'WebSocket error'); this._setState('error'); };

    } catch (e) {
      log('VE_ERROR', e.message);
      this._setState('error');
    }
  },

  _handleMessage(msg) {
    switch (msg.type) {
      case 'session.created':
        log('VE_SESSION', msg.session?.id || 'ok');
        break;
      case 'input_audio_buffer.speech_started':
        this._setState('user_speaking');
        break;
      case 'input_audio_buffer.speech_stopped':
        break;
      case 'conversation.item.input_audio_transcription.completed':
        log('VE_TRANSCRIPT', msg.transcript);
        break;
      case 'response.output_audio.delta':
        this._setState('speaking');
        this._playPcm16(msg.delta);
        break;
      case 'response.output_audio.done':
        this._setState('listening');
        break;
      case 'response.done':
        this._setState('listening');
        break;
      case 'error':
        log('VE_SERVER_ERROR', msg.error?.message || JSON.stringify(msg.error));
        break;
      default:
        log('VE_UNHANDLED', msg.type);
    }
  },

  _startMicStream() {
    const source = this._audioCtx.createMediaStreamSource(this._stream);
    const processor = this._audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
      this._ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }));
    };
    source.connect(processor);
    processor.connect(this._audioCtx.destination);
    log('VE_MIC_STREAMING');
  },

  /** Decode PCM16 base64 → Float32 → AudioBuffer → schedule playback. */
  _playPcm16(base64) {
    if (!this._audioCtx || !base64) return;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const view = new DataView(bytes.buffer);
      const sampleCount = Math.floor(bytes.byteLength / 2);
      const floatSamples = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) floatSamples[i] = view.getInt16(i * 2, true) / 32768;

      const buffer = this._audioCtx.createBuffer(1, sampleCount, this._outputSampleRate);
      buffer.copyToChannel(floatSamples, 0);

      const source = this._audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this._audioCtx.destination);

      const now = this._audioCtx.currentTime;
      const startAt = Math.max(now + 0.02, this._nextPlayTime);
      source.start(startAt);
      this._nextPlayTime = startAt + buffer.duration;
    } catch (e) {
      log('VE_PCM_ERROR', e.message);
    }
  },

  disconnect() {
    this._setState('disconnected');
    this._cleanup();
  },

  _cleanup() {
    if (this._ws) { this._ws.close(); this._ws = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
    this._nextPlayTime = 0;
  },

  _setState(state) {
    this._state = state;
    if (this._onState) this._onState(state);
  },

  get state() { return this._state; },
};

export default VoiceEngineClient;
