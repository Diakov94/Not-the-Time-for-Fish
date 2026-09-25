import { countryHouse } from '../../../src/content/maps/country-house.ts';
import { spawnPoint } from '../../../src/sim/build.ts';
import { IDLE, type Intent } from '../../../src/sim/movement.ts';
import type { Step } from '../client.ts';
import type { Scenario } from '../run.ts';

const walk = (z: number): Intent => ({ move: { x: 0, z }, sprint: false, jump: false });

// A cat's script: from its spawn in the country house's hideout it walks north, grabs, walks back, throws,
// and walks north to the fence.
const CAT: Step[] = [
  [0, walk(1), null],
  [0.6, IDLE, 'grab'],
  [0.8, walk(-1), null],
  [2.0, IDLE, 'throw'],
  [2.2, walk(-1), null],
  [3.4, walk(1), null],
  [7.0, IDLE, null],
];
// A dog's: from its spawn in the yard it walks north to the fence, then sniffs.
const DOG: Step[] = [
  [0, walk(1), null],
  [4.0, { ...IDLE, sniff: true }, null],
  [7.0, IDLE, null],
];
const side = (i: number) => (i % 3 === 2 ? 'dog' : 'cat');

// The gates' 10 s at two clients, on the country house (or the map `--map` names): each character enters
// at its side's level spawn point, the n-th player of a side at its n-th point, so two players who enter at once stand apart. Every
// third player is a dog (1 of 3, 2 of 6), until card 25's roster sides the players.
const defaultGame: Scenario = {
  about: 'walk, grab, throw in the hideout; a dog walks and sniffs',
  level: countryHouse,
  player: (i, level) => {
    const n = Array.from({ length: i }, (_, j) => side(j)).filter((s) => s === side(i)).length;
    return { side: side(i), at: spawnPoint(level, side(i), n)!.p, script: side(i) === 'dog' ? DOG : CAT };
  },
};
export default defaultGame;
