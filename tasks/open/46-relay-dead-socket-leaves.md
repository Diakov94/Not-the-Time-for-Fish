zone: src/relay
size: S
# A dead socket leaves the room

A player whose connection drops without a close (a laptop lid, a lost Wi-Fi) holds its place in the room until TCP gives up, minutes later, while its character stands frozen and the host's `state` waits for nobody. The Node host pings every socket every 5 s and terminates one that has not answered in 15 s, so the room module announces its `left` (card 38 then removes the character after 60 s). The room module itself is unchanged (ADR 0005: members and `seq` only); the Durable Object host, when it comes, does the same with its own alarm.

## DoD
- Detection lives in the host adapter, not in the room module; `room.test.ts` is untouched.

## Acceptance
- A headless client whose socket is paused (no close frame) is announced `left` to the others within 20 s; before: not within 60 s.

## Test
- One Vitest test in the relay's suite with a paused socket, red with the ping removed.
