import type { Volume } from '../../../src/content/level.ts';
import { yacht } from '../../../src/content/maps/yacht.ts';
import { p, type P } from './bots.ts';
import { roundOn, type Plan, type Room } from './fish-market.ts';

// Card 141: card 63's round on the yacht, the market's scripts (card 137) on the yacht's plan. The lanes are
// the bots' own map, clear of every prop. The galley table and the galley fridge are both reached by the
// porthole in the galley's port wall, so runners and kitchen cats share one room and one queue: runners up
// the port side (northbound at x = -9.4, southbound at -8.65, west of the tarpaulin) wait south of the
// porthole; kitchen cats go up the starboard side and round the foredeck, where the hunter watches, and
// wait north of it. Both leave by the port side's southbound lane. Dogs run the sides at x = +-9.1 and pass
// between the lifeboat and the coil of rope forward.
const L = yacht;
const storage = (access: string) => L.volumes.findIndex((v) => v.role === 'storage' && v.access === access);
const [gangway, sternLadder, porthole, anchorChain] = L.volumes.filter((v) => v.role === 'exit') as [Volume, Volume, Volume, Volume];
const cage = L.volumes.find((v) => v.role === 'kennel')!;
const TOSS = p(cage.p.x - cage.half.x - 1.1, cage.p.z); // 1 m west of the cage, facing it (card 29)
const GALLEY: Omit<Room, 'spot'> = {
  room: { x0: -5.9, x1: -1.6, z0: 0.1, z1: 7.9 },
  passage: { x0: -7.1, x1: -5, z0: 2.7, z1: 4 },
  queue: { x0: -7.8, x1: -6.6, z0: 0.2, z1: 7.5 },
};
const GAP: [P, P] = [p(-6.7, 3.35), p(-5.4, 3.35)];
const PORT_DOWN = [p(-8.2, 2.6), p(-8.65, -2.8), p(-8.65, -12)];
const STARBOARD_UP = [p(8.9, -12), p(8.9, 8.9)];
const FOREDECK = [p(-1.8, 10.5), p(-5.3, 10.5), p(-7.2, 8.5)];
const yachtPlan: Plan = {
  level: L,
  about: 'yacht',
  gate: gangway,
  table: {
    storage: storage('open'),
    room: { ...GALLEY, spot: (k) => p(-7.2, 2.2 - 0.8 * k) },
    to: [p(0.4, -16), p(-2, -12.8), p(-9.4, -11), p(-9.4, -3.5)],
    gap: GAP,
    steps: [p(-4.85, 2.6)],
    home: PORT_DOWN,
  },
  pantry: {
    storage: storage('door'),
    room: { ...GALLEY, spot: (k) => p(-7.2, 4.7 + 0.8 * k) },
    to: [...STARBOARD_UP, p(8.9, 9.6), p(1.8, 9.6), ...FOREDECK],
    gap: GAP,
    steps: [p(-5.45, 6.45)],
    home: PORT_DOWN,
  },
  rescue: {
    fromHome: STARBOARD_UP,
    fromQueue: [p(-8.3, 3), p(-8.3, 6), ...FOREDECK.slice(0, 2).reverse()],
    standby: [...STARBOARD_UP, p(2.5, 8.7)],
    home: [p(8.9, 9.1), p(8.9, -12)],
    fromCage: FOREDECK,
  },
  // The hunter from its spawn round the lifeboat and down the port side to the gangway and the stern ladder,
  // then up the starboard side to its watch on the foredeck's port side, 8 m up the kitchen cats' way with a
  // clear line past the cage and the tarpaulin: card 63's chase length (as the market's, card 137).
  hunter: {
    mines: [
      [p(-3.2, 13.4), p(-7.5, 13.3), p(-9.1, 10), p(-9.1, -12), p(-6.5, -18.8), p(gangway.p.x, gangway.p.z + 0.7)],
      [p(sternLadder.p.x, sternLadder.p.z + 0.7)],
    ],
    watch: [p(9.1, -12), p(9.1, 9.1), p(2, 9.3), p(-1.8, 10.3), p(-3, 10.9), p(-5.6, 11)],
    prey: { x0: -8, x1: 9.5, z0: 9.2, z1: 11.5 }, // the foredeck, clear of the galley's porthole and the standby
    near: 8,
    carry: [p(-2.6, 10.6), p(TOSS.x - 1.2, TOSS.z), TOSS], // the last leg straight at the cage: no swing before the throw
    after: [p(-3.2, 13.8), p(1, 15)],
  },
  guards: [
    { to: [p(4.5, 16.8), p(anchorChain.p.x - 0.7, anchorChain.p.z)], back: p(anchorChain.p.x - 2.2, anchorChain.p.z) },
    { to: [p(1.5, 14.3), p(-3.2, 13.4), p(-7.5, 13.3), p(-9.1, 10), p(porthole.p.x + 0.7, porthole.p.z)], back: p(porthole.p.x + 0.7, porthole.p.z + 2.5) },
  ],
  park: (n) => p(-6 + 1.5 * n, -27),
};
export default roundOn(yachtPlan);
