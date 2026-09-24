zone: src/app
size: S
files: src/app/input.ts, src/app/main.ts
# At spawn the camera looks along +z whatever way the character faces: dogs start looking at the fence

The camera orbits by `input.look`, which starts at yaw 0 (looking along +z) and turns only with the mouse; the spawn points carry a facing (the country house's dogs spawn with `yaw: Math.PI`, toward the house). So at every prep a dog's screen opens on its dog's face with the fence behind it, and W walks the dog away from the house into the fence (seen in a two-tab session: the dog against the fence after 6 s of W, the house never in view). Cats face +z by content, so they start right by luck. A new round, a side swap and a rejoin all respawn the character, so it happens every round.

The facing is the body's (the sim spawned it on the point); the look is the app's per-viewer state (card 103 moves it into `src/input`; land there if that card is in). The app knows the moment: `own()` names a new net id.

## DoD
- When the own character's net id changes, the look's yaw is set from the body's rotation (`yawOf`), so the camera starts behind the character looking the way content pointed it; the pitch stays.

## Acceptance
- At prep on the country house the camera's yaw is within 0.01 rad of the spawn point's `yaw` on every client (before: 0 rad against the dogs' π), and a dog's first frame shows the house, not the fence.

## Test
- None: the yaw is the check.
