zone: src/sim
size: M
# The sim runs a content Level; the Prototype room retires

ADR 0008: `createWorld` takes a content `Level`: statics become colliders, a `dogs` blocker one only dog bodies meet (card 22's sizes and kinds), volumes become sensors tagged by role, points answer spawn queries by role and side, synced props are spawned by the host with content's shapes and masses, debris is a local body on every client, doors are built (card 41 gives them their rules). `src/sim/level.ts` is deleted; the tests and the runner take a content level (the Prototype room of card 16 where a small room is enough). Closes the spawn-point half of `debt-one-owner-spawn-throw-port`: spawn points are the level's.

## DoD
- The sim holds no level data of its own and no table of prop labels: everything physical about the house comes from content, everything physical about kinds (cat, dog, fish, mine, trap, bag, lure) from the sim.
- The host spawns the level's synced props and the fish at the `fish` points; debris is never in the entity table and never ticked.

## Acceptance
- With the country house loaded in Node: a dog walking into a cat route stops at the gap and a cat walks through; the entity table holds 5 fish and the level's synced prop count; debris bodies exist on every client and none is in any table.
- The sim's step with the house loaded, Rapier's own step excluded, stays under 1 ms at 60 Hz in Node with 8 characters (ADR 0004's sign; name the number); Rapier's step included: name the number, and say so if it passes 4 ms.
- `npm run headless -- --clients 2 --seconds 20` on the house: exit 0.

## Test
- One Vitest test for the gating (a dog stopped, a cat through), red with the blocker's group removed.
