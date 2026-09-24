import type { Vector } from '@dimforge/rapier3d-compat';

// A level is static geometry plus the synced props its host spawns (ADR 0006: the host spawns
// the level's props with its own net ids, so the crates are listed here, not built by createWorld).
export type Level = {
  halfSize: number; // the floor is a square of 2 * halfSize, its top at y = 0
  wallHeight: number;
  crates: Vector[]; // crate centres
  climbs?: { p: Vector; half: Vector }[]; // boxes a cat climbs inside (a drainpipe)
};

export const CRATE_HALF = 0.5;

// The Prototype room: floor, four walls, ten crates in two rows along the north side.
export const prototypeRoom: Level = {
  halfSize: 10,
  wallHeight: 3,
  crates: [-6, -3, 0, 3, 6].flatMap((x) => [
    { x, y: CRATE_HALF, z: 6 },
    { x, y: CRATE_HALF, z: 8 },
  ]),
};
