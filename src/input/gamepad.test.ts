import { afterEach, expect, test, vi } from 'vitest';
import { intent, listen } from './keyboard.ts';

const FRAME = 1000 / 60; // ms

// A Gamepad API stub: one pad in the standard mapping whose sticks and buttons the test sets, and the
// frames run by hand through a stubbed requestAnimationFrame; no keyboard or mouse event ever fires.
function rig() {
  const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  const pads: (typeof pad | null)[] = [null, pad];
  let poll: FrameRequestCallback = () => {};
  let now = performance.now();
  vi.stubGlobal('navigator', { getGamepads: () => pads });
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => (poll = f));
  vi.stubGlobal('addEventListener', () => {});
  const grabs = { n: 0 };
  const input = listen({ addEventListener: () => {} } as unknown as HTMLCanvasElement, () => 'A:0', {
    grab: () => grabs.n++,
    plant() {},
    interact() {},
    perk() {},
    mark() {},
    next() {},
    report() {},
    emote() {},
  });
  const frame = () => poll((now += FRAME));
  return { pad, pads, input, grabs, frame };
}
afterEach(() => vi.unstubAllGlobals());

test('the left stick walks in the same frame, the right turns the camera 180°/s, the deadzone holds', () => {
  const { pad, input, frame } = rig();
  pad.axes = [0, -0.1, 0, 0]; // inside the store's default deadzone, 0.15
  frame();
  expect(intent(input, 'A:0').move).toEqual({ x: 0, z: 0 });
  pad.axes = [0, -1, 0, 0];
  performance.mark('stick');
  frame();
  const move = intent(input, 'A:0').move;
  const { duration } = performance.measure('stick to intent', 'stick');
  console.log(`stick to intent: same frame, ${duration.toFixed(3)} ms`);
  expect(move.z).toBeCloseTo(1, 9);
  pad.axes = [0, 0, 1, 0];
  const yaw = input.look.yaw;
  for (let i = 0; i < 60; i++) frame();
  console.log(`right stick full for 1 s: ${(((yaw - input.look.yaw) * 180) / Math.PI).toFixed(3)}°`);
  expect(yaw - input.look.yaw).toBeCloseTo(Math.PI, 9);
});

test('a button presses once however long it is held, and a pad gone lets go of everything', () => {
  const { pad, pads, input, grabs, frame } = rig();
  pad.axes = [0, -1, 0, 0];
  pad.buttons[7]!.pressed = true; // RT: grab
  pad.buttons[2]!.pressed = true; // X: interact held
  for (let i = 0; i < 30; i++) frame();
  expect(grabs.n).toBe(1);
  expect(intent(input, 'A:0')).toMatchObject({ move: { z: 1 }, sniff: true, defuse: true });
  pads.length = 0;
  frame();
  expect(intent(input, 'A:0')).toMatchObject({ move: { x: 0, z: 0 }, sniff: false, defuse: false });
  expect(input.keys.size).toBe(0);
});
