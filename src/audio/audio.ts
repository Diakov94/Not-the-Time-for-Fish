import type { Vec3 } from '../content/level.ts';
import { volumeAt } from '../sim/build.ts';
import { isCharacter, type ClientId, type Entity, type NetId } from '../sim/entities.ts';
import type { SimEvent } from '../sim/events.ts';
import { progress } from '../sim/mines.ts';
import { SPEED } from '../sim/movement.ts';
import { tension } from '../sim/tension.ts';
import type { Sim } from '../sim/world.ts';
import { ambience, surround, type Ambience } from './ambience.ts';
import { music, sequence, wanted, type Music } from './music.ts';
import { beeps, pant, SOUNDS, whiteNoise, type Beeps, type Kit, type Pant, type Sound } from './sfx.ts';

// Where the listener stands and faces: at the point the camera orbits (the player's character), turned
// as the camera is, so distances are the character's and left and right are the screen's.
export type Ear = { position: Vec3; quaternion: Vec3 & { w: number } };

type Graph = {
  kit: Kit & { ctx: AudioContext };
  master: GainNode;
  meters: AnalyserNode[];
  pants: Map<NetId, Pant & { at: PannerNode }>;
  defusing: (Beeps & { at: PannerNode }) | null;
  ambience: Ambience;
  music: Music;
};

// The game's sound, a view of the sim (ADR 0008): every frame it reads the event list, the entity,
// ownership and round tables and the sim's volume and tension queries, and keeps no fact beyond the voices
// it plays and the music's scheduler. The graph is made on the first click (the browser's autoplay rule);
// M mutes it, a per-viewer setting. With `?audio` in the address a dev readout shows the master bus's
// peak, the worst lag from an event's frame to its sound leaving the speakers, and what `hear` costs the
// main thread per frame.
export type Audio = { graph: Graph | null; muted: boolean; readout: HTMLElement | null; peak: number; lag: number; cost: { sum: number; max: number; frames: number } };

const REF = 2; // m: a voice nearer than this is at full level; farther, it falls as REF / distance
// The limiter squeezes the sum 20:1 above its threshold and adds a makeup gain the Web Audio spec sets at
// 0.6 of the curve's range (9.5 dB x 0.6 = 5.7 dB here); the master's level takes it back, so a sound under
// the threshold passes at unity.
const LIMITER = { threshold: -10, knee: 0, ratio: 20, attack: 0.002, release: 0.2 };
const LEVEL = 10 ** (-5.7 / 20);
const METER = new Float32Array(2048); // the analyser's window, longer than a frame at 60 FPS

export function createAudio(): Audio {
  const audio: Audio = { graph: null, muted: false, readout: null, peak: 0, lag: 0, cost: { sum: 0, max: 0, frames: 0 } };
  addEventListener('pointerdown', () => (audio.graph = start(audio.muted)), { once: true });
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM' || e.repeat || e.target instanceof HTMLInputElement) return;
    audio.muted = !audio.muted;
    audio.graph?.master.gain.setTargetAtTime(audio.muted ? 0 : LEVEL, audio.graph.kit.ctx.currentTime, 0.02);
  });
  if (new URLSearchParams(location.search).has('audio')) {
    audio.readout = document.body.appendChild(document.createElement('pre'));
    audio.readout.style.cssText = 'position:fixed;right:8px;bottom:8px;margin:0;padding:4px 8px;background:#0008;font:12px monospace';
  }
  return audio;
}

// The master bus: everything meets in `master` (the mute), a limiter keeps the sum under full scale, and
// a meter per channel listens to what reaches the speakers (an analyser alone would hear their mix).
function start(muted: boolean): Graph {
  const ctx = new AudioContext();
  const master = new GainNode(ctx, { gain: muted ? 0 : LEVEL });
  const limiter = master.connect(new DynamicsCompressorNode(ctx, LIMITER));
  limiter.connect(ctx.destination);
  const channels = limiter.connect(new ChannelSplitterNode(ctx, { numberOfOutputs: 2 }));
  const meters = [0, 1].map((i) => {
    const meter = new AnalyserNode(ctx, { fftSize: METER.length });
    channels.connect(meter, i);
    return meter;
  });
  const kit = { ctx, noise: whiteNoise(ctx) };
  return { kit, master, meters, pants: new Map(), defusing: null, ambience: ambience(kit, master), music: music(kit, master) };
}

// Once per frame, after the sim stepped and before the loop drains the event list.
export function hear(audio: Audio, sim: Sim, ear: Ear): void {
  const g = audio.graph;
  if (!g) return;
  const now = performance.now();
  listen(g.kit.ctx.listener, ear);
  for (const ev of sim.events) {
    const t = play(g, sim, ev);
    const out = g.kit.ctx.getOutputTimestamp(); // the context's time leaving the speakers now, and when
    if (t !== undefined && out.performanceTime) audio.lag = Math.max(audio.lag, out.performanceTime + (t - out.contextTime!) * 1000 - now);
  }
  breathe(g, sim);
  defuse(g, sim);
  // The player's body in the house, by the sim's volume query; the yard while it has no body.
  const me = characterOf(sim, sim.me);
  surround(g.ambience, g.kit, me !== undefined && volumeAt(sim, 'house', me.body.translation()) >= 0);
  sequence(g.music, g.kit, wanted(sim.round.phase, tension(sim)));
  const cost = performance.now() - now;
  audio.cost = { sum: audio.cost.sum + cost, max: Math.max(audio.cost.max, cost), frames: audio.cost.frames + 1 };
  if (audio.readout) show(audio, g);
}

// The listener's pose from the ear's: it faces the camera's -z with the camera's +y up.
function listen(l: AudioListener, { position: p, quaternion: { x, y, z, w } }: Ear): void {
  l.setPosition(p.x, p.y, p.z);
  l.setOrientation(-2 * (x * z + w * y), 2 * (w * x - y * z), 2 * (x * x + y * y) - 1, 2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x));
}

// A voice placed in the world, so it comes from where it happened.
function at(g: Graph, p: Vec3): PannerNode {
  const { ctx } = g.kit;
  const panner = new PannerNode(ctx, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: REF, positionX: p.x, positionY: p.y, positionZ: p.z });
  panner.connect(g.master);
  return panner;
}

// A one-shot where it happened, or heard everywhere (a phase stinger) with no place.
function sound(g: Graph, s: Sound, p: Vec3 | null, loud: number): number {
  const out = p ? at(g, p) : g.master;
  const t = g.kit.ctx.currentTime;
  const sources = SOUNDS[s](g.kit, out, t, loud);
  if (out !== g.master) Promise.all(sources.map((n) => new Promise((ended) => (n.onended = ended)))).then(() => out.disconnect());
  return t;
}

// A client's character: who made a step, or the player's own body.
const characterOf = (sim: Sim, client: ClientId): Entity | undefined =>
  [...sim.entities.values()].find((e) => e.home === client && isCharacter(e.kind));

// An event's sound, and when it starts on the context's clock. A blast's and a sprung trap's noise is
// the dogs' ping of them: they are heard at their own events, which come first.
function play(g: Graph, sim: Sim, ev: SimEvent): number | undefined {
  if (ev.type === 'noise' && ev.cause === 'step') {
    const c = characterOf(sim, ev.from);
    return c?.kind === 'dog' ? sound(g, 'dogStep', ev.p, ev.loud * dogBoost(sim, c)) : sound(g, 'catStep', ev.p, ev.loud);
  }
  if (ev.type === 'noise') return ev.cause === 'blast' || ev.cause === 'trap' ? undefined : sound(g, 'impact', ev.p, ev.loud);
  if (ev.type === 'grab' || ev.type === 'throw' || ev.type === 'drop') {
    const e = sim.entities.get(ev.id);
    return e && sound(g, ev.type === 'grab' && e.kind === 'fish' ? 'pickup' : ev.type, e.body.translation(), 1);
  }
  if (ev.type === 'planted') return sound(g, ev.kind === 'mine' ? 'arm' : 'trapSet', ev.p, 1);
  if (ev.type === 'blast' || ev.type === 'defused' || ev.type === 'sprung') return sound(g, ev.type, ev.p, 1);
  if (ev.type === 'secured' || ev.type === 'captured' || ev.type === 'rescue' || ev.type === 'dugOut') return sound(g, ev.type, ev.p, 1);
  if (ev.type === 'phase' && (ev.to === 'heist' || ev.to === 'overtime' || ev.to === 'over')) return sound(g, ev.to, null, 1);
  return undefined;
}

// This client's defuse beeps where its cat stands while the sim's progress query says it runs, and stop
// the frame it is interrupted or done.
function defuse(g: Graph, sim: Sim): void {
  const work = progress(sim);
  const me = characterOf(sim, sim.me);
  const t = g.kit.ctx.currentTime;
  if (work?.what !== 'defuse' || !me) {
    g.defusing?.stop(t);
    g.defusing?.at.disconnect();
    g.defusing = null;
    return;
  }
  const p = me.body.translation();
  if (!g.defusing) {
    const panner = at(g, p);
    g.defusing = { ...beeps(g.kit, panner), at: panner };
  }
  [g.defusing.at.positionX.value, g.defusing.at.positionY.value, g.defusing.at.positionZ.value] = [p.x, p.y, p.z];
  g.defusing.set(work.done, t);
}

// A dog's step is louder the faster it goes than a walk, and twice as loud while it carries (card 53).
function dogBoost(sim: Sim, dog: Entity): number {
  const v = dog.body.linvel();
  const carrying = [...sim.ownership.rows.values()].some((r) => r.owner === dog.home && r.held);
  return Math.max(1, Math.hypot(v.x, v.z) / SPEED.dog.walk) * (carrying ? 2 : 1);
}

// Every dog pants where it stands, faster and louder the faster it runs; its voice ends with it.
function breathe(g: Graph, sim: Sim): void {
  const t = g.kit.ctx.currentTime;
  for (const e of sim.entities.values()) {
    if (e.kind !== 'dog') continue;
    const p = e.body.translation();
    let v = g.pants.get(e.id);
    if (!v) {
      const panner = at(g, p);
      g.pants.set(e.id, (v = { ...pant(g.kit, panner), at: panner }));
    }
    [v.at.positionX.value, v.at.positionY.value, v.at.positionZ.value] = [p.x, p.y, p.z];
    const run = Math.min(1, Math.hypot(e.body.linvel().x, e.body.linvel().z) / SPEED.dog.sprint);
    v.level.gain.setTargetAtTime(0.3 + 0.5 * run, t, 0.3);
    v.rate.frequency.setTargetAtTime(1.5 + 2.5 * run, t, 0.3);
  }
  for (const [id, v] of g.pants) {
    if (sim.entities.has(id)) continue;
    v.stop();
    v.at.disconnect();
    g.pants.delete(id);
  }
}

function show(audio: Audio, g: Graph): void {
  for (const meter of g.meters) {
    meter.getFloatTimeDomainData(METER);
    for (const x of METER) audio.peak = Math.max(audio.peak, Math.abs(x));
  }
  const { sum, max, frames } = audio.cost;
  if (frames % 15) return;
  const db = (20 * Math.log10(audio.peak)).toFixed(1);
  audio.readout!.textContent = `peak ${db} dBFS · lag ${audio.lag.toFixed(0)} ms · hear ${(sum / frames).toFixed(2)} ms, max ${max.toFixed(2)}`;
}
