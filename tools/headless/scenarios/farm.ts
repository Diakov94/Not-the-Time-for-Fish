import type { Volume } from '../../../src/content/level.ts';
import { farm } from '../../../src/content/maps/farm.ts';
import { p } from './bots.ts';
import { roundOn, type Plan } from './fish-market.ts';

// Card 139: card 63's round on the farm, the market's scripts (card 137) on the farm's plan. The lanes are
// the bots' own map, clear of every prop. Runners take the kitchen table's fish: up the west of the
// farmhouse (northbound at x = -13, southbound at -12.2, west of the hay bale on its wall), along its back
// (queueing at z = 9.6, leaving at 8.6) and in by the kitchen's cat flap to the table's south side, the
// only one no chair stands at. Kitchen cats take the smokehouse rack's fish through its open doorway,
// between the farmhouse and the smokehouse (northbound at x = 3.9, southbound at 3.1). The feed bin stands
// where the house's toss spot would be, so the hunter tosses over the coop's gate, from the south. Dogs run
// the west at x = -16, the east at 11 and the north at z = 14.8, clear of the traps.
const L = farm;
const storage = (access: string) => L.volumes.findIndex((v) => v.role === 'storage' && v.access === access);
const [culvert, gate, westGap, eastHole] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
const coop = L.volumes.find((v) => v.role === 'kennel')!;
const TOSS = p(coop.p.x, coop.p.z - coop.half.z - 1.1); // 1 m south of the coop's gate, facing it
const WEST_UP = [p(-13, -1), p(-13, 9.6)];
const EAST_UP = [p(3.9, -1)];
const EAST_DOWN = [p(3.1, 9.4), p(3.1, -1)];
const farmPlan: Plan = {
  level: L,
  about: 'farm',
  gate,
  table: {
    storage: storage('open'),
    room: {
      room: { x0: -9.9, x1: -4.1, z0: 4.1, z1: 7.9 },
      passage: { x0: -6.3, x1: -5, z0: 7, z1: 9.2 },
      queue: { x0: -9.2, x1: -6.2, z0: 9.2, z1: 10 },
      spot: (k) => p(-6.6 - 0.8 * k, 9.6),
    },
    to: WEST_UP,
    gap: [p(-5.65, 8.6), p(-5.65, 7.3)],
    steps: [p(-4.9, 6.5), p(-4.9, 4.75), p(-6.9, 4.75)],
    home: [p(-12.2, 8.6), p(-12.2, -1.5), p(-10.5, -8)],
  },
  pantry: {
    storage: storage('door'),
    room: {
      room: { x0: 5.1, x1: 7.9, z0: 4.1, z1: 6.9 },
      passage: { x0: 4, x1: 5.7, z0: 4.8, z1: 6.2 },
      queue: { x0: 3.5, x1: 4.3, z0: 2, z1: 4.8 },
      spot: (k) => p(3.9, 4.4 - 0.8 * k),
    },
    to: EAST_UP,
    gap: [p(4.3, 5.5), p(5.6, 5.5)],
    steps: [p(6.55, 5.5)],
    home: [p(3.1, 5.5), p(3.1, -1)],
  },
  rescue: {
    fromHome: [...EAST_UP, p(3.5, 8.7)],
    fromQueue: [],
    standby: [...WEST_UP, p(-13, 10.5), p(-4.2, 10.5), p(-3.2, 9.5)],
    home: EAST_DOWN,
    fromCage: [p(coop.p.x - 0.5, 8.7), p(3.4, 8.7)],
  },
  // The hunter from its spawn along the north hedge and down the west to the culvert, along the hedge to
  // the gate, and up between the farmhouse and the smokehouse to its watch over the kitchen cats' queue.
  hunter: {
    mines: [
      [p(4, 14.8), p(-16, 14.8), p(-16, -13), p(culvert.p.x, culvert.p.z + 0.7)],
      [p(gate.p.x, gate.p.z + 0.7)],
    ],
    watch: [p(3.5, -9), p(3.5, 7.8)],
    prey: { x0: 2.5, x1: 8, z0: -2, z1: 7.5 },
    near: 7,
    // Out of the smokehouse's doorway first, should the chase end in it; the last leg straight at the coop: no
    // swing before the throw.
    carry: [p(4.2, 5.5), p(3.5, 8.8), p(TOSS.x, 8.8), TOSS],
    after: [p(3.5, TOSS.z), p(3.5, 14.8), p(8, 14.8)],
  },
  guards: [
    { to: [p(5.5, 14.8), p(11, 14.8), p(11, -4.5), p(12, -6), p(eastHole.p.x - 0.7, eastHole.p.z)], back: p(eastHole.p.x - 2.2, eastHole.p.z) },
    { to: [p(7, 14.8), p(-16, 14.8), p(-16, westGap.p.z), p(westGap.p.x + 0.7, westGap.p.z)], back: p(westGap.p.x + 2.2, westGap.p.z) },
  ],
  park: (n) => p(-6 + 1.5 * n, -27),
};
export default roundOn(farmPlan);
