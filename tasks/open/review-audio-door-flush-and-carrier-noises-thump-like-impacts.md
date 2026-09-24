zone: src/audio
size: S
files: src/audio/audio.ts, src/audio/sfx.ts
# A door opened, a cat flushed by a bark and the overtime carrier all sound like an impact

`play` maps every noise cause but `step`, `blast` and `trap` to the `impact` thump: card 52 knew impacts and steps, and cards 41, 42 and 69 added the `door`, `flush` and `carrier` causes after it. So a storage or a house door opening sounds like a crate dropped; a bark that flushes a hidden cat is a thump at the cat; and in overtime the carrying cat, and everyone near it, hears a crate drop at its own paws every second (CARRIER_EVERY 1 s) while its HUD says the dogs can hear it. Card 147 adds the emote, splash and slip sounds and does not cover these three.

## DoD
- Three sounds, one per cause: a creak for `door`, a yowl for `flush`, a heartbeat-like pulse for `carrier`, mapped by the noise's cause; `impact` stays for impacts.

## Acceptance
- In a two-tab session each of the three causes plays its own sound (3 of 3, by the `?audio` readout's lag line moving at the event and by ear); the carrier's pulse peaks no higher than a walking dog's step (≤ 0 dB relative), so it warns without startling.

## Test
- None: the readout and the ear.
