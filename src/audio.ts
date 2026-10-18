// Mic capture at 16 kHz PCM16 and playback of the model's 24 kHz PCM16 audio.

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1600); this.n = 0; }
  process([input]) {
    const ch = input[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice()); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('capture', Capture);
`;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function startMic(onChunk: (base64Pcm: string) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const ctx = new AudioContext({ sampleRate: 16000 });
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const node = new AudioWorkletNode(ctx, 'capture');
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const f = e.data;
    const pcm = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
    onChunk(toBase64(new Uint8Array(pcm.buffer)));
  };
  ctx.createMediaStreamSource(stream).connect(node);
  return () => {
    stream.getTracks().forEach((t) => t.stop());
    ctx.close();
  };
}

export class Player {
  private ctx = new AudioContext({ sampleRate: 24000 });
  private next = 0;
  private sources = new Set<AudioBufferSourceNode>();

  play(base64Pcm: string) {
    const bin = atob(base64Pcm);
    const pcm = new Int16Array(bin.length / 2);
    for (let i = 0; i < pcm.length; i++) pcm[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16 >> 16;
    const buf = this.ctx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    this.next = Math.max(this.next, this.ctx.currentTime);
    src.start(this.next);
    this.next += buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  // Called when the user talks over the model.
  interrupt() {
    this.sources.forEach((s) => s.stop());
    this.sources.clear();
    this.next = 0;
  }

  close() {
    this.interrupt();
    this.ctx.close();
  }
}
