import type { Look } from '../render/view.ts';
import { settings } from '../settings/store.ts';
import type { NetId } from '../sim/entities.ts';
import type { Intent } from '../sim/movement.ts';
import { codesOf, used, type Action } from './bindings.ts';
import { read } from './gamepad.ts';

const SENSITIVITY = 0.0025; // radians of camera turn per pixel of mouse motion
const TURN = Math.PI; // radians per second of camera turn at the right stick's full deflection: 180°/s
const PITCH_MIN = -0.3;
const PITCH_MAX = 1.3;
const TAP = 250; // ms: interact released sooner is also a tap; held, it is the hold from its press on
const LONGEST = 100; // ms: a longer frame (a tab back from the background) turns the camera as this much

// Whether `code` does `action`: the bindings table is the one owner of which key does what.
const does = (action: Action, code: string) => codesOf(action).includes(code);

// The codes held now with how far (a key or a button 1, a stick's half-axis up to 1), where the camera
// looks, the character sneak set sneaking and when interact went down; the sim reads it once per frame as
// an intent.
export type Input = { keys: Map<string, number>; look: Look; sneaking: NetId | undefined; pressedE: number };

// A press's one sim call each (card 49); the sim answers it by the player's own kind.
export type Actions = { grab: () => void; plant: () => void; interact: () => void; perk: () => void; mark: () => void; next: () => void; report: () => void };

// Keyboard on the window, the mouse on the canvas, the gamepad polled once a frame: all three are codes
// going down and up, so every device does every action the same way. The first left click captures the
// mouse for the camera, every later press is its action's call: `grab` (grab or throw), `mark`, `plant`,
// `perk`, `next` (the teammate a captured cat watches), `report`. Sneak toggles sneaking for the character
// `own` names now, so a new character starts upright. Interact is held from its press on (the intent's
// sniff and defuse) and, let go within TAP, is also a tap. The pad's poll is requested before the app's
// frame, so each frame's intent reads that frame's pad; a pad gone lets go of everything it held.
export function listen(canvas: HTMLCanvasElement, own: () => NetId | undefined, act: Actions): Input {
  const input: Input = { keys: new Map(), look: { yaw: 0, pitch: 0.35 }, sneaking: undefined, pressedE: -Infinity };
  const calls: [Action, () => void][] = [['grab', act.grab], ['mark', act.mark], ['plant', act.plant], ['perk', act.perk], ['next', act.next], ['report', act.report]];
  const down = (code: string, t: number) => {
    used(code);
    if (does('interact', code)) input.pressedE = t;
    if (does('sneak', code)) input.sneaking = input.sneaking === own() ? undefined : own();
    calls.forEach(([action, call]) => does(action, code) && call());
  };
  const up = (code: string, t: number) => {
    input.keys.delete(code);
    if (does('interact', code) && t - input.pressedE < TAP) act.interact();
  };
  const turn = (dx: number, dy: number) => {
    input.look.yaw -= dx;
    input.look.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, input.look.pitch + dy));
  };
  addEventListener('keydown', (e) => {
    input.keys.set(e.code, 1);
    if (does('report', e.code) || does('next', e.code)) e.preventDefault();
    if (!e.repeat) down(e.code, e.timeStamp);
  });
  addEventListener('keyup', (e) => up(e.code, e.timeStamp));
  addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault(); // no autoscroll
    if (e.button === 0 && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    else down(`Mouse${e.button}`, e.timeStamp);
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) turn(e.movementX * SENSITIVITY, e.movementY * SENSITIVITY);
  });
  let pad = new Map<string, number>(); // the pad's codes at the last poll
  let then = performance.now();
  requestAnimationFrame(function poll(now: number) {
    const p = read(navigator.getGamepads?.() ?? [], settings().deadzone); // none off a secure origin
    for (const code of pad.keys()) if (!p.codes.has(code)) up(code, now);
    for (const [code, v] of p.codes) {
      input.keys.set(code, v);
      if (!pad.has(code)) down(code, now);
    }
    pad = p.codes;
    const dt = Math.min(now - then, LONGEST) / 1000;
    turn(p.look.x * TURN * dt, p.look.y * TURN * dt);
    then = now;
    requestAnimationFrame(poll);
  });
  return input;
}

// The move codes relative to where the camera looks, turned into the world-space move the sim takes (a
// stick's part way is a slower walk), and the held actions as they stand for `own`, the character driven
// now: the sim reads sneak and defuse for a cat, sniff for a dog.
export function intent({ keys, look, sneaking }: Input, own: NetId | undefined): Intent {
  const key = (action: Action) => Math.max(0, ...codesOf(action).map((code) => keys.get(code) ?? 0));
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
