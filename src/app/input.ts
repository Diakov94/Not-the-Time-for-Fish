import type { Look } from '../render/view.ts';
import type { Intent } from '../sim/movement.ts';

const SENSITIVITY = 0.0025; // radians of camera turn per pixel of mouse motion
const PITCH_MIN = -0.3;
const PITCH_MAX = 1.3;

// The keys held now and where the camera looks; the sim reads it once per frame as an intent.
export type Input = { keys: Set<string>; look: Look };

// Keyboard on the window, the mouse on the canvas: the first click captures the mouse for the camera,
// every later left click is `act` (grab or throw); F9 is `report`.
export function listen(canvas: HTMLCanvasElement, act: () => void, report: () => void): Input {
  const input: Input = { keys: new Set(), look: { yaw: 0, pitch: 0.35 } };
  addEventListener('keydown', (e) => {
    input.keys.add(e.code);
    if (e.code !== 'F9') return;
    e.preventDefault();
    if (!e.repeat) report();
  });
  addEventListener('keyup', (e) => input.keys.delete(e.code));
  addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (document.pointerLockElement === canvas) act();
    else canvas.requestPointerLock();
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    input.look.yaw -= e.movementX * SENSITIVITY;
    input.look.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, input.look.pitch + e.movementY * SENSITIVITY));
  });
  return input;
}

// WASD relative to where the camera looks, turned into the world-space move the sim takes.
export function intent({ keys, look }: Input): Intent {
  const key = (code: string) => (keys.has(code) ? 1 : 0);
  const ahead = key('KeyW') - key('KeyS');
  const right = key('KeyD') - key('KeyA');
  const [s, c] = [Math.sin(look.yaw), Math.cos(look.yaw)];
  return {
    move: { x: ahead * s - right * c, z: ahead * c + right * s },
    sprint: key('ShiftLeft') + key('ShiftRight') > 0,
    jump: keys.has('Space'),
  };
}
