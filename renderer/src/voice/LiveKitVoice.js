/** V2-1 LiveKit Voice Client — mature WebRTC via livekit-client SDK.

 *  Electron mic → LiveKit → Agent → remote audio → Electron speaker.
 *  No RTCPeerConnection, no SDP, no /rtc/offer, no custom audio pipeline.
 */
import { Room, RoomEvent, RemoteTrackPublication } from 'livekit-client';

const ROOM = 'julia-voice-v2-1';
const IDENTITY = 'tony-electron';

const log = (tag, detail) => console.log(`[${tag}]`, detail || '');

const LiveKitVoice = {
  _room: null,
  _state: 'disconnected',
  _onState: null,
  _onTranscript: null,

  async connect({ onState, onTranscript } = {}) {
    this._onState = onState;
    this._onTranscript = onTranscript;
    this._setState('connecting');
    log('LK_ROOM_CONNECTING');

    try {
      // Get token from Gateway
      const resp = await fetch(`http://127.0.0.1:8100/livekit/token?room=${ROOM}&identity=${IDENTITY}`);
      const { url, token } = await resp.json();
      if (!token) throw new Error('No token from Gateway');

      // Connect to LiveKit room
      const room = new Room();
      this._room = room;

      room.on(RoomEvent.Connected, () => {
        log('LK_ROOM_CONNECTED');
        this._setState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        log('LK_ROOM_DISCONNECTED');
        this._setState('disconnected');
      });

      // Handle incoming tracks
      room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        if (track.kind === 'audio') {
          log('LK_AUDIO_TRACK_SUBSCRIBED', participant.identity);
          track.attach();
          log('LK_AUDIO_ATTACHED');
        }
      });

      // Handle data/transcript messages
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const text = new TextDecoder().decode(payload);
          log('LK_DATA', text);
        } catch {}
      });

      await room.connect(url, token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      log('LK_MIC_ENABLED');
      this._setState('live');

    } catch (e) {
      log('LK_ERROR', e.message);
      this._setState('error');
    }
  },

  disconnect() {
    if (this._room) {
      this._room.disconnect();
      this._room = null;
    }
    this._setState('disconnected');
  },

  _setState(state) {
    this._state = state;
    if (this._onState) this._onState(state);
  },

  get state() { return this._state; },
  get isLive() { return this._state === 'live'; },
};

export default LiveKitVoice;
