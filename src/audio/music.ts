import type { Phase } from '../sim/messages.ts';
import { hiss, seeded, tone, type Kit } from './sfx.ts';

// GAME.md, Audio Direction: procedural music adaptive to the round's phase. A step sequencer clocked on
// the context schedules synthesised notes a little ahead of its clock. Its mood follows the round table's
// phase and the sim's tension: quiet in the lobby and at the round's end, calm in prep, tense in the
// heist, a chase while the sim says tense. The mood changes only on a beat and every note has its own
// envelope, so a change never cuts one. A seed makes the piece reproducible; nothing is stored.
export type Mood = 'quiet' | 'calm' | 'tense' | 'chase';

// Each mood's tempo and its bar of sixteenths per voice (x a hit), the chance of a lead note on a
// sixteenth, and the bar roots its bass and lead play over (MIDI notes, one per bar in turn).
type Score = { bpm: number; kick: string; snare: string; hat: string; bass: string; lead: number; roots: number[] };
const MOODS: Record<Mood, Score> = {
  quiet: { bpm: 80, kick: '', snare: '', hat: '', bass: '', lead: 0, roots: [57] },
  calm: { bpm: 80, kick: '', snare: '', hat: '....x.......x...', bass: 'x.......x.......', lead: 0.15, roots: [57, 53, 55, 52] },
  tense: { bpm: 110, kick: 'x.......x.......', snare: '', hat: '..x...x...x...x.', bass: 'x.x.x.x.x.x.x.x.', lead: 0.12, roots: [57, 58, 57, 56] },
  chase: { bpm: 140, kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: 'xx.xx.xx.xx.xx.x', lead: 0.45, roots: [57, 57, 60, 58] },
};
const SCALE = [0, 3, 5, 7, 10, 12, 15]; // the minor pentatonic over the root, semitones
const AHEAD = 0.12; // s the sequencer schedules ahead of the context's clock, longer than a slow frame
const LINGER = 2; // bars a chase outlasts the tension, so a dog at the edge of the range does not flicker it

// The scheduler's state: the mood playing, the next sixteenth's time and number, the seeded stream the
// lead draws from, and when the chase was last asked for.
export type Music = { mood: Mood; next: number; step: number; random: () => number; out: GainNode; hot: number };

export function music(k: Kit, out: AudioNode, seed = 1): Music {
  const bus = new GainNode(k.ctx, { gain: 0.5 });
  bus.connect(out);
  return { mood: 'quiet', next: k.ctx.currentTime, step: 0, random: seeded(seed), out: bus, hot: -Infinity };
}

// The mood the round asks for.
export function wanted(phase: Phase, tense: boolean): Mood {
  if (phase === 'prep') return 'calm';
  if (phase === 'heist' || phase === 'overtime') return tense ? 'chase' : 'tense';
  return 'quiet';
}

// Schedules every sixteenth before `until`. On a beat the mood turns to `want`, at once, except that a
// chase the tension left lingers LINGER bars after it was last asked for. A stalled tab resumes from now,
// not in a burst.
export function sequence(m: Music, k: Kit, want: Mood, until = k.ctx.currentTime + AHEAD): void {
  if (want === 'chase') m.hot = k.ctx.currentTime;
  m.next = Math.max(m.next, k.ctx.currentTime);
  while (m.next < until) {
    const lingers = m.mood === 'chase' && want === 'tense' && m.next - m.hot < (LINGER * 4 * 60) / MOODS.chase.bpm;
    if (m.step % 4 === 0 && want !== m.mood && !lingers) m.mood = want;
    play(m, k, m.next);
    m.next += 60 / MOODS[m.mood].bpm / 4;
    m.step++;
  }
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// One sixteenth of the mood's bar at `t`.
function play(m: Music, k: Kit, t: number): void {
  const s = MOODS[m.mood];
  const i = m.step % 16;
  const root = s.roots[Math.floor(m.step / 16) % s.roots.length]!;
  const beat = 60 / s.bpm;
  const calm = m.mood === 'calm';
  if (s.kick[i] === 'x') tone(k, m.out, t, { type: 'sine', f: [150, 45], dur: 0.25, peak: 0.7 });
  if (s.snare[i] === 'x') hiss(k, m.out, t, { filter: 'bandpass', f: [1800, 1200], q: 0.8, dur: 0.15, peak: 0.35 });
  if (s.hat[i] === 'x') hiss(k, m.out, t, { filter: 'highpass', f: [7000, 7000], dur: 0.04, peak: 0.12 });
  if (s.bass[i] === 'x') tone(k, m.out, t, { type: 'triangle', f: [hz(root - 12), hz(root - 12)], dur: calm ? 2 * beat : beat / 2, peak: 0.35 });
  if (m.random() < s.lead) {
    const n = hz(root + 12 + SCALE[Math.floor(m.random() * SCALE.length)]!);
    tone(k, m.out, t, { type: calm ? 'sine' : m.mood === 'tense' ? 'triangle' : 'square', f: [n, n], dur: calm ? 0.9 : 0.15, peak: calm ? 0.15 : 0.08 });
  }
}
