import { expect, test } from 'vitest';
import { anatomy } from '../anatomy.ts';
import type { Level } from '../level.ts';
import { fishMarket } from './fish-market.ts';

// Card 136's numbers over the data, by the promises every map keeps (anatomy.ts), by name, that a level breaks.
const broken = (level: Level) => anatomy(level).filter((c) => !c.kept).map((c) => c.promise);

test('the fish market keeps the promises of its anatomy, and breaks the exits promise with an exit removed', () => {
  for (const c of anatomy(fishMarket)) console.log(`${c.promise}: ${c.measured}${c.kept ? '' : ' BROKEN'}`);
  const exit = fishMarket.volumes.findIndex((v) => v.role === 'exit');
  expect(broken(fishMarket)).toEqual([]);
  expect(broken({ ...fishMarket, volumes: fishMarket.volumes.filter((_, i) => i !== exit) })).toEqual(['exits']);
});
