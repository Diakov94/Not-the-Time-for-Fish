// ADR 0008: the level is data with a schema content owns; the sim builds its world from it and holds no
// level data of its own. Metres, y up, the ground's top at y = 0. Every box is axis-aligned: a centre and
// half extents.
export type Vec3 = { x: number; y: number; z: number };
export type Box = { p: Vec3; half: Vec3 };

// A fixed collider. A `dogs` blocker is met by dog bodies only, so a cat route or an exit is a gap in the
// `all` boxes filled by a `dogs` one.
export type Static = Box & { label: string; blocks: 'all' | 'dogs' };

export type Access = 'open' | 'door' | 'lid';
// A sensor tagged by role; a storage names what taking its fish costs.
export type Volume = Box &
  ({ role: 'hideout' | 'house' | 'kennel' | 'doghouse' | 'exit' | 'hidingSpot' | 'climb' } | { role: 'storage'; access: Access });

// A spot on the surface under it, facing `yaw` (radians about +y, 0 along +z). The sim lifts a body
// spawned there by its own half height.
export type Point = {
  role: 'catSpawn' | 'dogSpawn' | 'fish' | 'bag' | 'trapPickup' | 'tunnelExit' | 'hatch' | 'latch';
  p: Vec3;
  yaw: number;
};

// A dynamic body that describes itself, so the sim needs no table of labels: the host spawns a synced
// prop as an entity, debris (`synced: false`) is a local body on every client. A hiding spot a prop
// carries is relative to `p` and moves with it.
export type Prop = {
  label: string;
  p: Vec3;
  shape: { box: Vec3 } | { ball: number }; // half extents, or a radius
  mass: number; // kg
  synced: boolean;
  hidingSpot?: Box;
};

// A panel, shown closed, swinging about the vertical axis through `hinge`.
export type Door = { panel: Box; hinge: Vec3 };

export type Level = { statics: Static[]; volumes: Volume[]; points: Point[]; props: Prop[]; doors: Door[] };

// Builders: a box from two opposite corners, and a vector from a triple.
export type V = [number, number, number];
export const vec = ([x, y, z]: V): Vec3 => ({ x, y, z });
export function span([x0, y0, z0]: V, [x1, y1, z1]: V): Box {
  return { p: vec([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]), half: vec([(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]) };
}
