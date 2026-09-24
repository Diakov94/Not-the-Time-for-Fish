import { prototypeRoom } from '../../../src/sim/level.ts';
import { IDLE, type Intent } from '../../../src/sim/movement.ts';
import type { Step } from '../client.ts';
import type { Scenario } from '../run.ts';

const walk = (z: number): Intent => ({ move: { x: 0, z }, sprint: false, jump: false });

// A cat's script: walk to the crate ahead, grab it, carry it back, throw it, push it on, then walk north
// into the crate of the second row, which the host owns, and push it to the wall.
const CAT: Step[] = [
  [0, walk(1), null],
  [0.6, IDLE, 'grab'],
  [0.8, walk(-1), null],
  [2.0, IDLE, 'throw'],
  [2.2, walk(-1), null],
  [3.4, walk(1), null],
  [7.0, IDLE, null],
];
// A dog's: it cannot hold a crate, so it shoves both of its lane's to the wall, then sniffs.
const DOG: Step[] = [
  [0, walk(1), null],
  [4.0, { ...IDLE, sniff: true }, null],
  [7.0, IDLE, null],
];
const LANES = [-6, -3, 0, 3, 6]; // the crate columns of the Prototype room

// The Prototype's game, the gates' 10 s at two clients: each character starts in its lane 4 m south of
// the first crate, facing it. Every third player is a dog (1 of 3, 2 of 6), until card 25's roster sides
// the players.
export const defaultGame: Scenario = {
  about: 'walk, grab, carry, throw, push; a dog shoves and sniffs',
  level: prototypeRoom,
  player: (i) => ({ side: i % 3 === 2 ? 'dog' : 'cat', at: { x: LANES[i % LANES.length]!, y: 1, z: 2 }, script: i % 3 === 2 ? DOG : CAT }),
};
