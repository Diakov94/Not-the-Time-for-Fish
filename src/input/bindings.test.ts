import { expect, test } from 'vitest';
import { BINDINGS, conflict, resolve } from './bindings.ts';

const CTRL = ['ControlLeft', 'ControlRight'];

// ADR 0012: the store's overrides on top of the input zone's defaults, and one code never does two actions.
test('an override replaces its action’s codes; one on a code another action does is refused', () => {
  expect(resolve(BINDINGS.keyboard, { sneak: 'KeyC' })).toMatchObject({ sneak: ['KeyC'], forward: ['KeyW'] });
  expect(resolve(BINDINGS.keyboard, { sneak: 'KeyW' })).toMatchObject({ sneak: CTRL, forward: ['KeyW'] });
  expect(resolve(BINDINGS.keyboard, { sneak: 'KeyC', plant: 'KeyC' })).toMatchObject({ sneak: CTRL, plant: ['KeyQ'] });
  // Plant moved off Q frees it for sneak, whichever override the store holds first.
  expect(resolve(BINDINGS.keyboard, { sneak: 'KeyQ', plant: 'KeyX' })).toMatchObject({ sneak: ['KeyQ'], plant: ['KeyX'] });
  expect(resolve(BINDINGS.gamepad, { jump: 'PadRT' })).toMatchObject({ jump: ['PadA'], grab: ['PadRT'] });
  expect([conflict('sneak', 'KeyW'), conflict('sneak', 'KeyC'), conflict('jump', 'PadRT'), conflict('jump', 'PadA')]).toEqual(['forward', null, 'grab', null]);
});
