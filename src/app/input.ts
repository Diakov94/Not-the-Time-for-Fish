import type { Look } from '../render/view.ts';
import type { NetId } from '../sim/entities.ts';
import type { Intent } from '../sim/movement.ts';

const SENSITIVITY = 0.0025; // radians of camera turn per pixel of mouse motion
const PITCH_MIN = -0.3;
const PITCH_MAX = 1.3;
const TAP = 250; // ms: E released sooner is also a tap, the interact; held, it is the hold from its press on

// The keys held now, where the camera looks, the character Ctrl set sneaking and when E went down; the
// sim reads it once per frame as an intent.
export type Input = { keys: Set<string>; look: Look; sneaking: NetId | undefined; pressedE: number };

// A press's one sim call each (card 49); the sim answers it by the player's own kind.
export type Actions = { grab: () => void; plant: () => void; interact: () => void; perk: () => void; mark: () => void; report: () => void };

// Keyboard on the window, the mouse on the canvas: the first click captures the mouse for the camera,
// every later left click is `grab` (grab or throw); the middle button is `mark`, Q `plant`, F `perk`, F9
// `report`. Ctrl toggles sneaking for the character `own` names now, so a new character starts upright.
// E is held from its press on (the intent's sniff and defuse) and, let go within TAP, is also a tap.
export function listen(canvas: HTMLCanvasElement, own: () => NetId | undefined, act: Actions): Input {
  const input: Input = { keys: new Set(), look: { yaw: 0, pitch: 0.35 }, sneaking: undefined, pressedE: -Infinity };
  const press: Record<string, () => void> = { KeyQ: act.plant, KeyF: act.perk, F9: act.report };
  addEventListener('keydown', (e) => {
    input.keys.add(e.code);
    if (e.code === 'F9') e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE') input.pressedE = e.timeStamp;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') input.sneaking = input.sneaking === own() ? undefined : own();
    press[e.code]?.();
  });
  addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (e.code === 'KeyE' && e.timeStamp - input.pressedE < TAP) act.interact();
  });
  addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      e.preventDefault(); // no autoscroll
      act.mark();
    }
    if (e.button !== 0) return;
    if (document.pointerLockElement === canvas) act.grab();
    else canvas.requestPointerLock();
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    input.look.yaw -= e.movementX * SENSITIVITY;
    input.look.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, input.look.pitch + e.movementY * SENSITIVITY));
  });
  return input;
}

// WASD relative to where the camera looks, turned into the world-space move the sim takes, and the held
// actions as they stand for `own`, the character driven now: the sim reads sneak and defuse for a cat,
// sniff for a dog.
export function intent({ keys, look, sneaking }: Input, own: NetId | undefined): Intent {
  const key = (code: string) => (keys.has(code) ? 1 : 0);
  const ahead = key('KeyW') - key('KeyS');
  const right = key('KeyD') - key('KeyA');
  const [s, c] = [Math.sin(look.yaw), Math.cos(look.yaw)];
  const held = keys.has('KeyE');
  return {
    move: { x: ahead * s - right * c, z: ahead * c + right * s },
    sprint: key('ShiftLeft') + key('ShiftRight') > 0,
    jump: keys.has('Space'),
    sneak: own !== undefined && sneaking === own,
    sniff: held,
    defuse: held,
  };
}
