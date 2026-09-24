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
  // A door swung open: its hinge's creak, a slow run of clicks that rises and falls through the wood.
  creak: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sawtooth', f: [70, 130], dur: 0.35, peak: 0.6 * loud, attack: 0.08 }),
    tone(k, out, t + 0.3, { type: 'sawtooth', f: [130, 90], dur: 0.3, peak: 0.5 * loud }),
    hiss(k, out, t, { filter: 'bandpass', f: [900, 1400], q: 8, dur: 0.6, peak: 1.2 * loud, attack: 0.1 }),
  ],
  // A cat a bark flushed out of its spot: an angry yowl, up and down.
  yowl: (k, out, t, loud) => [
    tone(k, out, t, { type: 'sawtooth', f: [500, 900], dur: 0.25, peak: 0.7 * loud, attack: 0.05 }),
    tone(k, out, t + 0.22, { type: 'sawtooth', f: [900, 450], dur: 0.45, peak: 0.7 * loud }),
  ],
  // The overtime carrier's ping: a heartbeat's lub-dub, low and soft, so it warns without startling.
  pulse: (k, out, t, loud) => [
    tone(k, out, t, { type: 'triangle', f: [90, 55], dur: 0.14, peak: 0.8 * loud }),
    tone(k, out, t + 0.2, { type: 'triangle', f: [80, 50], dur: 0.16, peak: 0.6 * loud }),
  ],
  // The round (card 55). A mine armed: a click and its fuse catching, a sizzle rising.
  arm: (k, out, t) => [
    tone(k, out, t, { type: 'square', f: [220, 110], dur: 0.05, peak: 0.35 }),
    hiss(k, out, t + 0.03, { filter: 'highpass', f: [3500, 6000], dur: 0.6, peak: 0.18, attack: 0.03 }),
  ],
  // A mine defused: a snip, and the fuse snuffed out, falling.
  defused: (k, out, t) => [
    hiss(k, out, t, { filter: 'highpass', f: [6000, 6000], dur: 0.02, peak: 0.5 }),
    tone(k, out, t + 0.03, { type: 'triangle', f: [1200, 300], dur: 0.35, peak: 0.25 }),
    hiss(k, out, t + 0.03, { filter: 'bandpass', f: [2500, 500], q: 2, dur: 0.3, peak: 0.25 }),
  ],
  // A blast, the loudest sound in the game: a deep boom under a long roar.
  blast: (k, out, t) => [
    tone(k, out, t, { type: 'sine', f: [110, 28], dur: 1.4, peak: 1.4 }),
    hiss(k, out, t, { filter: 'lowpass', f: [5000, 120], dur: 1.6, peak: 1.3 }),
    tone(k, out, t, { type: 'square', f: [55, 25], dur: 0.5, peak: 0.35 }),
  ],
  // A trap set down: the alarm clock wound, four ratchet clicks and its bell tapped.
  trapSet: (k, out, t) => [
    ...[0, 1, 2, 3].map((i) => hiss(k, out, t + 0.07 * i, { filter: 'bandpass', f: [2500, 2500], q: 6, dur: 0.03, peak: 0.8 })),
    tone(k, out, t + 0.3, { type: 'sine', f: [1568, 1568], dur: 0.15, peak: 0.12 }),
  ],
  // A trap sprung: the alarm clock ringing, its hammer between two bells for most of a second.
  sprung: (k, out, t) =>
    Array.from({ length: 14 }, (_, i) => tone(k, out, t + 0.05 * i, { type: 'square', f: i % 2 ? [1760, 1760] : [1568, 1568], dur: 0.05, peak: 0.22 })),
  // A cat captured: the cage slams, a clang of unrelated partials over a thud.
  captured: (k, out, t) => [
    ...[310, 457, 689, 1011].map((f, i) => tone(k, out, t, { type: 'sine', f: [f, f], dur: 1 - 0.15 * i, peak: 0.3 - 0.06 * i })),
    tone(k, out, t, { type: 'sine', f: [90, 50], dur: 0.2, peak: 0.6 }),
    hiss(k, out, t, { filter: 'lowpass', f: [2000, 300], dur: 0.08, peak: 0.4 }),
  ],
  // A rescue: the latch clacks, the gate whooshes open, and a two-note "ta-da".
  rescue: (k, out, t) => [
    hiss(k, out, t, { filter: 'highpass', f: [3000, 3000], dur: 0.03, peak: 0.5 }),
    hiss(k, out, t + 0.04, { filter: 'bandpass', f: [400, 2400], q: 2, dur: 0.3, peak: 0.35, attack: 0.1 }),
    tone(k, out, t + 0.25, { type: 'sawtooth', f: [523, 523], dur: 0.15, peak: 0.15 }),
    tone(k, out, t + 0.4, { type: 'sawtooth', f: [880, 880], dur: 0.45, peak: 0.15 }),
  ],
  // A dig-out: earth scratched in bursts, and a pop out of the ground.
  dugOut: (k, out, t) => [
    ...[0, 0.07, 0.17, 0.25, 0.36].map((d) => hiss(k, out, t + d, { filter: 'bandpass', f: [900, 500], q: 1.5, dur: 0.06, peak: 0.5 })),
    tone(k, out, t + 0.45, { type: 'sine', f: [300, 900], dur: 0.08, peak: 0.4 }),
  ],
  // A fish secured, the round's reward: a fanfare up to a held high note, with a shimmer.
  secured: (k, out, t) => [
    ...[392, 523, 659, 784].map((f, i) => tone(k, out, t + 0.08 * i, { type: 'triangle', f: [f, f], dur: 0.12, peak: 0.3 })),
    tone(k, out, t + 0.32, { type: 'triangle', f: [1047, 1047], dur: 0.6, peak: 0.3 }),
    hiss(k, out, t + 0.32, { filter: 'highpass', f: [8000, 8000], dur: 0.6, peak: 0.06 }),
  ],
  // The phase stingers, heard everywhere. The heist begins: two horns a fifth apart, rising.
  heist: (k, out, t) => [
    tone(k, out, t, { type: 'sawtooth', f: [220, 440], dur: 0.6, peak: 0.15, attack: 0.05 }),
    tone(k, out, t, { type: 'sawtooth', f: [330, 660], dur: 0.6, peak: 0.15, attack: 0.05 }),
  ],
  // Overtime begins: a siren, twice up and down.
  overtime: (k, out, t) =>
    [0, 1, 2, 3].map((i) => tone(k, out, t + 0.25 * i, { type: 'triangle', f: i % 2 ? [900, 600] : [600, 900], dur: 0.25, peak: 0.3, attack: 0.02 })),
  // The round is over: a falling cadence onto a low gong.
  over: (k, out, t) => [
    ...[784, 659, 523].map((f, i) => tone(k, out, t + 0.18 * i, { type: 'triangle', f: [f, f], dur: 0.2, peak: 0.25 })),
    tone(k, out, t + 0.54, { type: 'sine', f: [131, 131], dur: 1.5, peak: 0.4 }),
    tone(k, out, t + 0.54, { type: 'sine', f: [393, 393], dur: 1, peak: 0.1 }),
  ],
} satisfies Record<string, Voice>;
export type Sound = keyof typeof SOUNDS;

// A defuse under way (card 55): a timer's beeps, quicker and higher as `done` runs from 0 to 1, until
// `stop`, at once.
export type Beeps = { set: (done: number, t: number) => void; stop: (t: number) => void };
export function beeps(k: Kit, out: AudioNode): Beeps {
  const pitch = new OscillatorNode(k.ctx, { type: 'triangle', frequency: 900 });
  const rate = new OscillatorNode(k.ctx, { type: 'square', frequency: 3 });
  const gate = new GainNode(k.ctx, { gain: 0.5 }); // the square's +-0.5 on top: on half of every beat
  const level = new GainNode(k.ctx, { gain: 0.25 });
  rate.connect(new GainNode(k.ctx, { gain: 0.5 })).connect(gate.gain);
  pitch.connect(gate).connect(level).connect(out);
  pitch.start();
  rate.start();
  return {
    set: (done, t) => {
      pitch.frequency.setValueAtTime(900 + 500 * done, t);
      rate.frequency.setValueAtTime(3 + 7 * done, t);
    },
    stop: (t) => {
      level.gain.setValueAtTime(0, t);
      [pitch, rate].forEach((s) => s.stop(t + 0.01));
    },
  };
}

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
