/** AudioWorklet processor: mic → PCM16 frames → postMessage. outputs=0 (never to speaker). */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSamples = Math.round(sampleRate * 0.020); // 20ms
    this.buffer = new Float32Array(this.frameSamples);
    this.offset = 0;

    this.port.postMessage({
      type: 'capture.ready',
      sampleRate,
      frameSamples: this.frameSamples,
    });
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0];
    if (!channel) return true;

    let srcOffset = 0;
    while (srcOffset < channel.length) {
      const available = this.frameSamples - this.offset;
      const remaining = channel.length - srcOffset;
      const count = Math.min(available, remaining);

      this.buffer.set(channel.subarray(srcOffset, srcOffset + count), this.offset);
      this.offset += count;
      srcOffset += count;

      if (this.offset === this.frameSamples) {
        const pcm16 = new Int16Array(this.frameSamples);
        for (let i = 0; i < this.frameSamples; i++) {
          const s = Math.max(-1, Math.min(1, this.buffer[i]));
          pcm16[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
        }
        this.port.postMessage({ type: 'pcm', sampleRate, pcm: pcm16.buffer }, [pcm16.buffer]);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
