import { expect, test } from 'vitest';
import { COSMETICS } from '../art/cosmetics.ts';
import type { Progress } from './progress.ts';
import { newlyUnlocked, ruled, unlocked } from './unlocks.ts';

const none: Progress = { matches: 0, wins: { cat: 0, dog: 0 }, fish: 0, captured: 0, rescues: 0, defuses: 0, mines: 0, dugOut: 0 };

// ADR 0013: a rule for an id the catalogue lacks is a defect, and so is a cosmetic no one can earn.
test('every rule names a catalogue id and every catalogue id has a rule', () => {
  const ids = COSMETICS.map((c) => c.id);
  expect(ruled().filter((id) => !ids.includes(id))).toEqual([]);
  expect(ids.filter((id) => !ruled().includes(id))).toEqual([]);
  expect(ruled()).toHaveLength(12);
});

// Each count at its threshold or one short of it: a moved threshold changes the list.
test('a progress unlocks exactly the ids its numbers earn', () => {
  const p: Progress = { matches: 4, wins: { cat: 3, dog: 2 }, fish: 10, captured: 4, rescues: 5, defuses: 2, mines: 20, dugOut: 0 };
  const earned = ['paper-crown', 'fish-skeleton', 'medal', 'ushanka', 'flat-cap', 'straw-hat', 'loaf'];
  expect(unlocked(none)).toEqual([]);
  expect(unlocked(p).sort()).toEqual(earned.sort());
  expect(newlyUnlocked(none, p).sort()).toEqual(earned);
});
