/** Voice Engine Client — WSS transport to AutoDL Voice Engine.

 *  Mic → WSS → AutoDL VAD/STT → Mac Julia Brain → ElevenLabs TTS → Speaker.
 *  Contract: voice-stream-events.md v1.0.0
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
  _playbackNode: null,

  async connect({ onState, onTranscript, onAudioLevel } = {}) {
    this._onState = onState;
    this._onTranscript = onTranscript;
    this._onAudioLevel = onAudioLevel;
    this._setState('connecting');
    log('VE_CONNECTING');

    try {
      // Mic capture with AEC — Chromium echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      this._stream = stream;

      // Log actual AEC settings
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      log('VE_MIC_SETTINGS', {
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
      });

      // AudioContext for level meter + playback
      this._audioCtx = new AudioContext({ sampleRate: settings.sampleRate || 48000 });

      // Mic level meter
      if (onAudioLevel) {
        const source = this._audioCtx.createMediaStreamSource(stream);
        const analyser = this._audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (this._state === 'disconnected') return;
          analyser.getByteFrequencyData(data);
          const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length) / 255;
          if (this._onAudioLevel) this._onAudioLevel(rms);
          requestAnimationFrame(tick);
        };
        tick();
      }

      // Connect WSS to Voice Engine
      this._ws = new WebSocket(VOICE_ENGINE_URL);
      this._ws.binaryType = 'arraybuffer';

      this._ws.onopen = () => {
        this._setState('connected');
        log('VE_CONNECTED');

        // Start streaming mic audio via AudioWorklet or ScriptProcessor
        // AutoDL speech-to-speech expects raw PCM via WebSocket binary frames
        this._startMicStream();
      };

      this._ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            this._handleMessage(msg);
          } catch {}
        } else {
          // Binary audio chunk → play
          this._playAudioChunk(event.data);
        }
      };

      this._ws.onclose = () => {
        this._setState('disconnected');
        log('VE_DISCONNECTED');
        this._cleanup();
      };

      this._ws.onerror = (e) => {
        log('VE_ERROR', e.message || 'WebSocket error');
        this._setState('error');
      };

    } catch (e) {
      log('VE_ERROR', e.message);
      this._setState('error');
    }
  },

  _handleMessage(msg) {
    switch (msg.type) {
      case 'session.created':
        log('VE_SESSION_CREATED', msg.session_id);
        break;

      case 'transcript.partial':
        if (this._onTranscript) this._onTranscript(msg.text, false);
        break;

      case 'transcript.final':
        if (this._onTranscript) this._onTranscript(msg.text, true);
        log('VE_TRANSCRIPT_FINAL', msg.text?.slice(0, 60));
        break;

      case 'assistant.text.delta':
        // Forwarded from Julia Brain SSE — for UI
        log('VE_RESPONSE_DELTA', msg.text?.slice(0, 60));
        break;

      case 'response.done':
        log('VE_RESPONSE_DONE', msg.status);
        this._setState('listening');
        break;

      case 'speech.started':
        this._setState('speaking');
        break;

      case 'speech.stopped':
        this._setState('listening');
        break;

      default:
        log('VE_EVENT', msg.type);
    }
  },

  _startMicStream() {
    const source = this._audioCtx.createMediaStreamSource(this._stream);
    // ScriptProcessor for raw PCM access (AudioWorklet preferred in prod)
    const bufferSize = 4096;
    const processor = this._audioCtx.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      // Convert Float32 [-1,1] to Int16 PCM
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      }
      this._ws.send(pcm.buffer);
    };

    source.connect(processor);
    processor.connect(this._audioCtx.destination);  // silent, just keeps processor alive
    this._setState('listening');
    log('VE_MIC_STREAMING', `${bufferSize}samples at ${this._audioCtx.sampleRate}Hz`);
  },

  _playAudioChunk(buffer) {
    if (!this._audioCtx) return;
    const bytes = new Uint8Array(buffer);
    // Decode and play via AudioContext
    this._audioCtx.decodeAudioData(bytes.buffer.slice(0), (audioBuffer) => {
      const source = this._audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._audioCtx.destination);
      source.start();
    }, () => {
      // Decode failed — might be raw PCM, play direct
    });
  },

  disconnect() {
    this._setState('disconnected');
    this._cleanup();
  },

  _cleanup() {
    if (this._ws) { this._ws.close(); this._ws = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
  },

  _setState(state) {
    this._state = state;
    if (this._onState) this._onState(state);
  },

  get state() { return this._state; },
  get isLive() { return this._state === 'listening' || this._state === 'speaking'; },
};

export default VoiceEngineClient;
