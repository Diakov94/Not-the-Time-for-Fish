import { expect, test, vi } from 'vitest';
import { offerBindings, type Remap } from '../settings/screen.ts';
import { BINDINGS } from './bindings.ts';

vi.mock('../settings/screen.ts', () => ({ offerBindings: vi.fn() }));

// Card 166: the settings screen's remap page learns the bindings and the clash rule from the input zone
// alone, through its port; a press another action does is refused there.
test('the input zone hands the remap port its tables and refuses a clash through it', async () => {
  await import('./remap.ts');
  const port: Remap = vi.mocked(offerBindings).mock.calls[0]![0];
  expect(Object.keys(port.table().keyboard)).toEqual(Object.keys(BINDINGS.keyboard));
  expect([port.conflict('sneak', 'KeyW'), port.conflict('jump', 'PadRT'), port.conflict('sneak', 'KeyV')]).toEqual(['forward', 'grab', null]);
});
