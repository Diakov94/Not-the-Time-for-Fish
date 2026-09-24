import { expect, test } from 'vitest';
import { CHARACTERS, ofSide } from './characters.ts';

// The roster's data check (card 100): GAME.md's six per side, ids unique and ASCII (the art's file names),
// every character with one to four emotes.
test('six characters per side, unique ASCII ids, one to four emotes each', () => {
  expect([ofSide('cat').length, ofSide('dog').length]).toEqual([6, 6]);
  const ids = CHARACTERS.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const c of CHARACTERS) {
    expect(c.id).toMatch(/^[a-z0-9-]+$/);
    expect(c.emotes.length, c.id).toBeGreaterThanOrEqual(1);
    expect(c.emotes.length, c.id).toBeLessThanOrEqual(4);
  }
});
