zone: src/sim
size: S
# The overtime carrier's continuous noise ping

GAME.md, Round Structure: in overtime every carrier emits a continuous noise ping. The sim does not emit it: `noises` pings impacts and steps only, so batch R2 (card 55) found no event for audio to play, and card 60's "the carrier's tab says it is pinging" has no fact to read. ADR 0010 already owns the shape: a noise ping is born at the client that simulates the body, sent as `noise {p, loud, cause}` and appended to every client's event list on arrival.

## DoD
- While the round table says overtime, the client that holds a fish sends a noise ping at its character's position every fixed interval, with a cause of its own (`carrier`); nobody else detects or restates it.
- A query answers "this client is the pinging carrier" from the same condition, for the HUD; audio and render read the event.

## Acceptance
- In overtime a carrier's pings arrive on every client at the chosen interval (name it, e.g. 1 s ± one step); none before overtime, none after the fish is secured or dropped, none from a cat that holds no fish.

## Test
- One sim test: a carrier's client in overtime produces the ping at the interval and stops on the drop; red without the rule.
