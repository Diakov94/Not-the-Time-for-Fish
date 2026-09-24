import type { Look } from '../render/view.ts';
import type { NetId } from '../sim/entities.ts';
import type { Intent } from '../sim/movement.ts';
import { BINDINGS, type Action } from './bindings.ts';

const SENSITIVITY = 0.0025; // radians of camera turn per pixel of mouse motion
const PITCH_MIN = -0.3;
const PITCH_MAX = 1.3;
const TAP = 250; // ms: interact released sooner is also a tap; held, it is the hold from its press on

// Whether `code` does `action`: the bindings table is the one owner of which key does what.
const does = (action: Action, code: string) => BINDINGS.keyboard[action].includes(code);

// The keys held now, where the camera looks, the character sneak set sneaking and when interact went
// down; the sim reads it once per frame as an intent.
export type Input = { keys: Set<string>; look: Look; sneaking: NetId | undefined; pressedE: number };

// A press's one sim call each (card 49); the sim answers it by the player's own kind.
export type Actions = { grab: () => void; plant: () => void; interact: () => void; perk: () => void; mark: () => void; next: () => void; report: () => void };

// Keyboard on the window, the mouse on the canvas: the first left click captures the mouse for the
// camera, every later press is its action's call: `grab` (grab or throw), `mark`, `plant`, `perk`, `next`
// (the teammate a captured cat watches), `report`. Sneak toggles sneaking for the character `own` names
// now, so a new character starts upright. Interact is held from its press on (the intent's sniff and
// defuse) and, let go within TAP, is also a tap.
export function listen(canvas: HTMLCanvasElement, own: () => NetId | undefined, act: Actions): Input {
  const input: Input = { keys: new Set(), look: { yaw: 0, pitch: 0.35 }, sneaking: undefined, pressedE: -Infinity };
  const calls: [Action, () => void][] = [['grab', act.grab], ['mark', act.mark], ['plant', act.plant], ['perk', act.perk], ['next', act.next], ['report', act.report]];
  const press = (code: string) => calls.forEach(([action, call]) => does(action, code) && call());
  addEventListener('keydown', (e) => {
    input.keys.add(e.code);
    if (does('report', e.code) || does('next', e.code)) e.preventDefault();
    if (e.repeat) return;
    if (does('interact', e.code)) input.pressedE = e.timeStamp;
    if (does('sneak', e.code)) input.sneaking = input.sneaking === own() ? undefined : own();
    press(e.code);
  });
  addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (does('interact', e.code) && e.timeStamp - input.pressedE < TAP) act.interact();
  });
  addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault(); // no autoscroll
    if (e.button === 0 && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    else press(`Mouse${e.button}`);
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    input.look.yaw -= e.movementX * SENSITIVITY;
    input.look.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, input.look.pitch + e.movementY * SENSITIVITY));
  });
  return input;
}

// The move keys relative to where the camera looks, turned into the world-space move the sim takes, and
// the held actions as they stand for `own`, the character driven now: the sim reads sneak and defuse for a
// cat, sniff for a dog.
export function intent({ keys, look, sneaking }: Input, own: NetId | undefined): Intent {
  const key = (action: Action) => (BINDINGS.keyboard[action].some((code) => keys.has(code)) ? 1 : 0);
  const ahead = key('forward') - key('back');
  const right = key('right') - key('left');
  const [s, c] = [Math.sin(look.yaw), Math.cos(look.yaw)];
  const held = key('interact') > 0;
  return {
    move: { x: ahead * s - right * c, z: ahead * c + right * s },
    sprint: key('sprint') > 0,
    jump: key('jump') > 0,
    sneak: own !== undefined && sneaking === own,
    sniff: held,
    defuse: held,
  };
}
