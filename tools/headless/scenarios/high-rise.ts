import type { Volume } from '../../../src/content/level.ts';
import { highRise } from '../../../src/content/maps/high-rise.ts';
import { p } from './bots.ts';
import { roundOn, type Plan } from './fish-market.ts';

// Card 135: card 63's round on the high-rise, the market's scripts (card 137) on the high-rise's plan. The
// lanes are the bots' own map, clear of every prop. The gate is the balcony gap, one cat wide, so cats go out
// and come back on one lane through it, coming back in turn. Runners take the kitchen table's fish by the kitchen's vent from the
// landing south of the flat (eastbound at z = -11.9, westbound at -12.7). Kitchen cats go up the west of the
// flat (northbound at x = -10, southbound at -11, west of the flat's corner and east of the mailboxes), in
// by the bedroom's vent, through the gap to the living room and the doorway to the kitchen, to the fridge's
// open side out of the hall door's reach; the one room at a time is the whole flat. The hunter watches the
// kitchen cats' queue from beside the bicycle and tosses from west of the kennel. Dogs run the east at x =
// 10.2, the west at -13.2 and -15.5, the north at z = 14.5 and 15, north of the stairs.
const L = highRise;
const storage = (access: string) => L.volumes.findIndex((v) => v.role === 'storage' && v.access === access);
const [gap, drainpipe, vent, stairwell] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
const kennel = L.volumes.find((v) => v.role === 'kennel')!;
const TOSS = p(kennel.p.x - kennel.half.x - 1.1, kennel.p.z); // 1 m west of the cage, facing it (card 29)
const KITCHEN = { x0: 1.1, x1: 8.9, z0: -7.9, z1: -1.1 };
const FLAT = { x0: -8.9, x1: 8.9, z0: -7.9, z1: 3.9 };
const EAST_UP = [p(-9.4, -11.9), p(4.4, -11.9), p(10.2, -11.5), p(10.2, 7.2)];
const highRisePlan: Plan = {
  level: L,
  about: 'high-rise',
  gate: gap,
  lane: 0,
  table: {
    storage: storage('open'),
    room: {
      room: KITCHEN,
      passage: { x0: 5.8, x1: 6.9, z0: -9.2, z1: -7.1 },
      queue: { x0: 4, x1: 6, z0: -10.2, z1: -9.4 },
      spot: (k) => p(5.6 - 0.8 * k, -9.8),
    },
    to: EAST_UP.slice(0, 2),
    gap: [p(6.35, -8.75), p(6.35, -7.3)],
    steps: [p(5.25, -5.55)],
    home: [p(6.9, -10), p(6.9, -12.7), p(-8.6, -12.7)],
  },
  pantry: {
    storage: storage('door'),
    room: {
      room: FLAT,
      passage: { x0: -8.8, x1: -7.7, z0: 3, z1: 5.2 },
      queue: { x0: -10.6, x1: -8.85, z0: 4.4, z1: 5.4 },
      spot: (k) => p(-9.3 - 0.8 * k, 4.9),
    },
    to: [p(-10, 4)],
    gap: [p(-8.25, 4.75), p(-8.25, 3.3)],
    steps: [p(-7.8, 1.6), p(-7.15, 0), p(-7.15, -1.8), p(-6.5, -3.05), p(-0.3, -3.05), p(0.3, -4.5), p(1.6, -4.5), p(2.25, -3.2), p(2.25, -1.85)],
    home: [p(-8.6, 5.8), p(-11, 5.8), p(-11, -11.6)],
  },
  rescue: {
    fromHome: EAST_UP,
    fromQueue: [p(6.9, -10.3), p(10.2, -10.5), p(10.2, 7.2)],
    standby: [...EAST_UP, p(3.2, 7)],
    home: [p(3.5, 6.6), p(11, 7), p(11, -12.7), p(-8.6, -12.7)],
    fromCage: [p(-7.5, 6.6)],
  },
  // The hunter from its spawn down the east to the drainpipe and along the rail to the gap, then up the west
  // to its watch north of the kitchen cats' queue: from 4 m the carry to the toss spot is under 10 m.
  hunter: {
    mines: [
      [p(10.2, 8.5), p(10.2, -11.8), p(drainpipe.p.x, drainpipe.p.z + 0.7)],
      [p(gap.p.x, gap.p.z + 0.7)],
    ],
    watch: [p(-13.2, -12.4), p(-13.2, 7.8), p(-8.4, 7)],
    prey: { x0: -10.6, x1: -8.8, z0: 3.3, z1: 5.3 },
    near: 4,
    carry: [p(TOSS.x - 1.2, TOSS.z), TOSS], // the last leg straight at the cage: no swing before the throw
    after: [p(TOSS.x, 14), p(3, 14.5)],
  },
  guards: [
    { to: [p(10, 14.5), p(15, 14.5), p(stairwell.p.x - 0.7, stairwell.p.z)], back: p(stairwell.p.x - 2.2, stairwell.p.z) },
    { to: [p(9, 15), p(-15.5, 15), p(-15.5, vent.p.z), p(vent.p.x + 0.7, vent.p.z)], back: p(vent.p.x + 2.2, vent.p.z) },
  ],
  park: (n) => p(-6 + 1.5 * n, -25),
};
export default roundOn(highRisePlan);
