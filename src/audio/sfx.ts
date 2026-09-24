// GAME.md, Audio Direction: every sound is synthesised in Web Audio at runtime, no samples in git. One
// function per kind of sound with the loudness as its only parameter, shaping one seeded noise, so the
// same event sounds the same in every tab.

// What a voice is made with: the context and the noise every voice shapes.
export type Kit = { ctx: BaseAudioContext; noise: AudioBuffer };
// A voice starts at `t` on the context's clock into `out` and returns the sources it started.
type Voice = (k: Kit, out: AudioNode, t: number, loud: number) => AudioScheduledSourceNode[];

// A reproducible stream of numbers in [0, 1) (mulberry32).
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two seconds of white noise, the same in every tab.
export function whiteNoise(ctx: BaseAudioContext): AudioBuffer {
  const random = seeded(1);
  const b = new AudioBuffer({ length: 2 * ctx.sampleRate, sampleRate: ctx.sampleRate });
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = random() * 2 - 1;
  return b;
}

// A note's shape: a glide from f[0] to f[1] Hz over `dur` s, rising to `peak` in `attack` s and dying away.
type Shape = { f: [number, number]; dur: number; peak: number; attack?: number };

function envelope(k: Kit, t: number, { dur, peak, attack = 0.004 }: Shape): GainNode {
  const g = new GainNode(k.ctx, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  return g;
}

export function tone(k: Kit, out: AudioNode, t: number, s: Shape & { type: OscillatorType }): AudioScheduledSourceNode {
  const o = new OscillatorNode(k.ctx, { type: s.type, frequency: s.f[0] });
  o.frequency.setValueAtTime(s.f[0], t);
  o.frequency.exponentialRampToValueAtTime(s.f[1], t + s.dur);
  o.connect(envelope(k, t, s)).connect(out);
  o.start(t);
  o.stop(t + s.dur);
  return o;
}

// Filtered noise; the filter's frequency glides.
export function hiss(k: Kit, out: AudioNode, t: number, s: Shape & { filter: BiquadFilterType; q?: number }): AudioScheduledSourceNode {
  const n = new AudioBufferSourceNode(k.ctx, { buffer: k.noise });
  const f = new BiquadFilterNode(k.ctx, { type: s.filter, frequency: s.f[0], Q: s.q ?? 1 });
  f.frequency.setValueAtTime(s.f[0], t);
  f.frequency.exponentialRampToValueAtTime(s.f[1], t + s.dur);
  n.connect(f).connect(envelope(k, t, s)).connect(out);
  n.start(t);
  n.stop(t + s.dur);
  return n;
}

// The one-shot sounds by kind. `loud` is the sim's loudness where the event has one, else 1.
export const SOUNDS = {
  // Bodies meeting: a thump under a crash, longer and brighter the louder.
  impact: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sine', f: [150 - 50 * loud, 45], dur: 0.15 + 0.3 * loud, peak: 0.25 + 0.6 * loud }),
    hiss(k, out, t, { filter: 'lowpass', f: [900 + 3000 * loud, 250], dur: 0.1 + 0.25 * loud, peak: 0.2 + 0.5 * loud }),
  ],
  // A snatch: a short bright rustle over a rising blip.
  grab: (k, out, t, loud) => [
    hiss(k, out, t, { filter: 'bandpass', f: [2600, 1200], q: 1.5, dur: 0.09, peak: 0.5 * loud }),
    tone(k, out, t, { type: 'triangle', f: [320, 640], dur: 0.08, peak: 0.25 * loud }),
  ],
  // A whoosh that rises as it leaves the hand.
  throw: (k, out, t, loud) => [hiss(k, out, t, { filter: 'bandpass', f: [350, 2600], q: 2.5, dur: 0.3, peak: 0.6 * loud, attack: 0.12 })],
  // A fish taken: two rising chimes, the game's reward.
  pickup: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sine', f: [784, 784], dur: 0.12, peak: 0.35 * loud }),
    tone(k, out, t + 0.08, { type: 'sine', f: [1175, 1175], dur: 0.2, peak: 0.35 * loud }),
  ],
  // Something let go: a falling flop.
  drop: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sine', f: [560, 170], dur: 0.2, peak: 0.5 * loud }),
    hiss(k, out, t, { filter: 'lowpass', f: [1200, 400], dur: 0.06, peak: 0.3 * loud }),
  ],
  // A paw: a cat's is a short soft pat; a dog's a heavier thud with its claws' click.
  catStep: (k, out, t, loud) => [hiss(k, out, t, { filter: 'lowpass', f: [1400, 700], q: 0.7, dur: 0.05, peak: 1.2 * loud })],
  dogStep: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sine', f: [110, 60], dur: 0.09, peak: 2 * loud }),
    hiss(k, out, t, { filter: 'lowpass', f: [300, 150], dur: 0.08, peak: 1.5 * loud }),
    hiss(k, out, t, { filter: 'highpass', f: [4000, 4000], dur: 0.015, peak: 0.25 * loud }),
  ],
} satisfies Record<string, Voice>;
export type Sound = keyof typeof SOUNDS;

// A dog's panting, a voice that lasts as long as the dog: breathy noise swelling at `rate` breaths a
// second, at `level`.
export type Pant = { level: GainNode; rate: OscillatorNode; stop: () => void };
export function pant(k: Kit, out: AudioNode): Pant {
  const n = new AudioBufferSourceNode(k.ctx, { buffer: k.noise, loop: true });
  const breath = new GainNode(k.ctx, { gain: 0.5 });
  const rate = new OscillatorNode(k.ctx, { frequency: 1.5 });
  const level = new GainNode(k.ctx, { gain: 0 });
  rate.connect(new GainNode(k.ctx, { gain: 0.5 })).connect(breath.gain);
  n.connect(new BiquadFilterNode(k.ctx, { type: 'bandpass', frequency: 1100, Q: 1.2 }))
    .connect(breath)
    .connect(level)
    .connect(out);
  n.start();
  rate.start();
  return { level, rate, stop: () => [n, rate].forEach((s) => s.stop()) };
}
