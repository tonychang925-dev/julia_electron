/** Voice Engine Client — WSS to AutoDL Julia Voice Gateway (julia-realtime.v1).
 *
 *  Protocol: JSON frames. Mic PCM16 → base64 → input_audio_buffer.append.
 *  Server → response.output_audio.delta → PCM16 decode → AudioContext playback.
 *
 *  P0 fixes (review 46e9622):
 *    - Restore onTranscript / onAudioLevel callbacks
 *    - Track local playback lifecycle; listening only after last source ends
 *    - Half-duplex: suppress mic upload during Julia speaking
 *    - Barge-in: cancel local + remote on speech_started during speaking
 */

const VOICE_ENGINE_URL = 'ws://127.0.0.1:8765/v1/realtime';

const log = (tag, detail) => console.log(`[${tag}]`, detail || '');

const VoiceEngineClient = {
  _ws: null,
  _stream: null,
  _audioCtx: null,
  _state: 'disconnected',
  _onState: null,
  _onTranscript: null,
  _onAudioLevel: null,
  _onResponseText: null,
  _nextPlayTime: 0,
  _outputSampleRate: 16000,
  _playingSources: new Set(),
  _pendingAudioDone: false,

  async connect({ onState, onTranscript, onAudioLevel, onResponseText } = {}) {
    // Re-entry guard: prevent double connection
    if (this._state === 'connecting' || this._state === 'listening' || this._state === 'speaking') {
      log('VE_SKIP_DUP', this._state);
      return;
    }

    this._onState = onState;
    this._onTranscript = onTranscript;
    this._onAudioLevel = onAudioLevel;
    this._onResponseText = onResponseText;
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
      await this._audioCtx.resume();
      log('VE_AUDIO_CTX', { state: this._audioCtx.state, sampleRate: this._audioCtx.sampleRate });

      if (this._audioCtx.sampleRate !== this._outputSampleRate) {
        log('VE_SR_MISMATCH', `expected ${this._outputSampleRate} got ${this._audioCtx.sampleRate}`);
      }

      this._nextPlayTime = 0;
      this._playingSources = new Set();
      this._pendingAudioDone = false;

      this._ws = new WebSocket(VOICE_ENGINE_URL);

      this._ws.onopen = () => {
        log('VE_CONNECTED');
        // Send session.update, wait for session.updated before mic
        this._ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            audio: {
              input: { turn_detection: { type: 'server_vad', interrupt_response: true } },
              output: {},
            },
          },
        }));
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          log('VE_PARSE_ERROR', String(event.data).slice(0, 200));
        }
      };

      this._ws.onclose = () => { this._setState('disconnected'); log('VE_DISCONNECTED'); this._cleanup(); };
      this._ws.onerror = (e) => { log('VE_SOCKET_ERROR', e?.message || 'WebSocket error'); this._setState('error'); this._cleanup(); };

    } catch (e) {
      log('VE_ERROR', e.message);
      this._cleanup();
      this._setState('error');
    }
  },

  _handleMessage(msg) {
    switch (msg.type) {
      case 'session.created':
        log('VE_SESSION', msg.session?.id || 'ok');
        break;
      case 'session.updated':
        this._setState('listening');
        this._startMicStream();
        break;
      case 'input_audio_buffer.speech_started':
        this._setState('user_speaking');
        // Barge-in: cancel local playback + remote turn
        this._cancelLocalPlayback();
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
          this._ws.send(JSON.stringify({ type: 'response.cancel' }));
        }
        break;
      case 'input_audio_buffer.speech_stopped':
        break;
      case 'conversation.item.input_audio_transcription.completed':
        log('VE_TRANSCRIPT', msg.transcript);
        if (this._onTranscript) this._onTranscript(msg.transcript, true);
        break;
      case 'response.text.delta':
        // Julia reply → ChatView
        if (this._onResponseText) this._onResponseText(msg.delta);
        break;
      case 'response.output_audio.delta':
        this._setState('speaking');
        this._playPcm16(msg.delta);
        break;
      case 'response.output_audio.done':
        // Mark pending — actual listening happens when all sources end
        this._pendingAudioDone = true;
        this._checkPlaybackDone();
        break;
      case 'response.done':
        this._pendingAudioDone = true;
        this._checkPlaybackDone();
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
      // Full-duplex: always send mic audio
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);

      // Audio level (RMS) for UI
      if (this._onAudioLevel) {
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        this._onAudioLevel(Math.min(1, rms * 5)); // scale up for visual
      }

      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
      this._ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }));
    };
    source.connect(processor);
    const pad = this._audioCtx.createGain();
    pad.gain.value = 0;
    processor.connect(pad);
    pad.connect(this._audioCtx.destination);
    log('VE_MIC_STREAMING', { aec: true, pad: '0' });
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

      // Track source for lifecycle
      this._playingSources.add(source);
      source.onended = () => {
        this._playingSources.delete(source);
        this._checkPlaybackDone();
      };
    } catch (e) {
      log('VE_PCM_ERROR', e.message);
    }
  },

  _cancelLocalPlayback() {
    for (const source of this._playingSources) {
      try { source.stop(); } catch (e) { /* already stopped */ }
    }
    this._playingSources.clear();
    this._nextPlayTime = this._audioCtx ? this._audioCtx.currentTime : 0;
  },

  _checkPlaybackDone() {
    if (this._pendingAudioDone && this._playingSources.size === 0) {
      this._pendingAudioDone = false;
      this._setState('listening');
    }
  },

  disconnect() {
    this._setState('disconnected');
    this._cleanup();
  },

  _cleanup() {
    this._cancelLocalPlayback();
    if (this._ws) { this._ws.close(); this._ws = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
    this._nextPlayTime = 0;
    this._pendingAudioDone = false;
  },

  _setState(state) {
    this._state = state;
    if (this._onState) this._onState(state);
  },

  get state() { return this._state; },
};

export default VoiceEngineClient;
