import { span, vec, type Level, type Static, type V } from './level.ts';

const wall = (min: V, max: V): Static => ({ label: 'wall', blocks: 'all', ...span(min, max) });

// The Prototype room of src/sim/level.ts in the content schema: a 20 m floor, four 3 m walls and ten
// 1 m crates in two rows along the north side. The crate's mass is Rapier's default density times its volume.
export const prototypeRoom: Level = {
  statics: [
    { label: 'floor', blocks: 'all', ...span([-10, -1, -10], [10, 0, 10]) },
    wall([9.75, 0, -10], [10.25, 3, 10]),
    wall([-10.25, 0, -10], [-9.75, 3, 10]),
    wall([-10, 0, 9.75], [10, 3, 10.25]),
    wall([-10, 0, -10.25], [10, 3, -9.75]),
  ],
  volumes: [],
  points: [],
  props: [-6, -3, 0, 3, 6].flatMap((x) =>
    [6, 8].map((z) => ({ label: 'crate', p: vec([x, 0.5, z]), shape: { box: vec([0.5, 0.5, 0.5]) }, mass: 1, synced: true })),
  ),
  doors: [],
};
