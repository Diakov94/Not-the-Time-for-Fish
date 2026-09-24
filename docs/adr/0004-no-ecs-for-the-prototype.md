---
status: accepted
date: 2026-09-24
---

# No ECS library in the Prototype: a plain entity table

GAME.md lists "a lightweight ECS: bitecs or miniplex (TBD)". For the Prototype the answer is neither. The entity table in `src/sim` is a `Map` from net id to a plain typed object: net id, kind, synced or local, home owner, the Rapier body handle and the carry state. Rapier owns every pose and velocity; the table owns identity and ownership; nothing else stores either. Systems are plain functions that take the table and the world. The Prototype has two characters and about ten props; the Vertical Slice has six characters and perhaps two hundred entities, and a filter over two hundred plain objects at 60 Hz is not measurable.

## Considered options

- **bitecs 0.4**: rejected outright, not deferred. Its strength is structure-of-arrays storage over typed arrays, which pays off at thousands of entities we never reach, and it wants the pose in its own arrays: a second owner of the pose beside the Rapier body, which is the studio's dominant defect class (`gamestudio/roles/_common.md`, "Every fact has ONE owner"). Its numeric entity ids would also need a side map to net ids and to bodies.
- **miniplex 2**: deferred, and the named successor. It keeps entities as plain objects and adds cached archetype queries (`world.with("body", "owner")`). At our counts it adds nothing over a `Map` and a filter, has no index by net id (so the `Map` stays anyway), and is one more dependency for every gate to install. Its price if adopted later: the entity table module and every filter over it change; the entity objects do not, because miniplex takes them as they are.

The price of "none" is that migration, if the sign shows: one module and a handful of filters, bounded because the table is the only owner of identity and lives behind one file.

## Consequences

- One file, `src/sim/entities.ts`, owns the table. A second collection of entities anywhere (by kind, by owner, by mesh) that is kept in step by hand is a second owner and is rejected at review; a derived list is computed from the table when needed.
- The stack line in GAME.md that lists an ECS as TBD needs the owner's edit: none in the Prototype, miniplex if this ADR's sign shows. This ADR does not edit GAME.md.

## Refutation sign

Adopt miniplex, not bitecs, when any of these appears: a second index beside the by-net-id map is written and maintained by hand; the same filter predicate is written in three or more systems; the sim step without Rapier's own `world.step()` exceeds 1 ms at Vertical Slice entity counts, measured in the headless runner.
