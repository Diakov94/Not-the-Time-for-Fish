zone: src/sim
size: M
# Grab, carry and throw

A forward shape cast of at most 1.5 m; the carried entity is a kinematic follower at the carrier's anchor; a throw is a release with a velocity. Works on props and on characters: side rules (only cats carry props, only dogs grab cats) come with the Vertical Slice.

## DoD
- Grab and throw go through the fold's claim and release (card 04), never around it.

## Acceptance
- A crate carried 3 m stays within 0.05 m of the anchor on every step.
- A 6 m/s throw lands 2–4 m away.
- A grabbed character's body follows its carrier.

## Test
- One Vitest test per number.
