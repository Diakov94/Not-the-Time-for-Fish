import { seeded, tone, type Kit } from './sfx.ts';

// GAME.md: procedural household and yard ambience. Two beds, not placed in the world: the yard (leaves in
// the wind, a bird now and then) above 800 Hz, and the house (a room's hush under the fridge's hum) below
// 250 Hz. The bed the player's body is in is up; a move between them crossfades over CROSSFADE.
export type Ambience = { yard: GainNode; house: GainNode; inside: boolean | null; bird: number; random: () => number };

const CROSSFADE = 1.5; // s

export function ambience(k: Kit, out: AudioNode): Ambience {
  const { ctx } = k;
  const yard = new GainNode(ctx, { gain: 0 });
  const house = new GainNode(ctx, { gain: 0 });
  yard.connect(out);
  house.connect(out);
  const loop = (filter: BiquadFilterOptions, gain: number, bed: GainNode) => {
    const n = new AudioBufferSourceNode(ctx, { buffer: k.noise, loop: true });
    const level = new GainNode(ctx, { gain });
    n.connect(new BiquadFilterNode(ctx, filter)).connect(level).connect(bed);
    n.start();
    return level;
  };
  // The leaves swell and settle with the wind, one gust every 8 s or so.
  const leaves = loop({ type: 'bandpass', frequency: 1500, Q: 0.7 }, 0.06, yard);
  const wind = new OscillatorNode(ctx, { frequency: 0.13 });
  wind.connect(new GainNode(ctx, { gain: 0.04 })).connect(leaves.gain);
  wind.start();
  loop({ type: 'lowpass', frequency: 200 }, 0.08, house);
  const hum = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 50 });
  hum.connect(new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 150 })).connect(new GainNode(ctx, { gain: 0.02 })).connect(house);
  hum.start();
  return { yard, house, inside: null, bird: 0, random: seeded(3) };
}

// Every frame, with whether the player's body is in the house: its bed rises and the other falls; and the
// yard's next bird, two to four falling whistles, is scheduled when it is due.
export function surround(a: Ambience, k: Kit, inside: boolean): void {
  const t = k.ctx.currentTime;
  if (inside !== a.inside) {
    for (const [bed, up] of [[a.house, inside], [a.yard, !inside]] as const) {
      bed.gain.cancelScheduledValues(t);
      bed.gain.setValueAtTime(bed.gain.value, t);
      bed.gain.linearRampToValueAtTime(up ? 1 : 0, t + CROSSFADE);
    }
    a.inside = inside;
  }
  if (t < a.bird) return;
  const f = 2500 + 1500 * a.random();
  for (let i = 0, n = 2 + Math.floor(3 * a.random()); i < n; i++) {
    tone(k, a.yard, t + 0.05 + i * 0.09, { type: 'sine', f: [f, f * 0.8], dur: 0.07, peak: 0.03 });
  }
  a.bird = t + 1.5 + 4 * a.random();
}
