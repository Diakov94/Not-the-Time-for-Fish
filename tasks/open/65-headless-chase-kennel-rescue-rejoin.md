zone: tools/headless
size: M
# Scenario: a fish carried out under chase; a grab, the kennel and a rejoin

STUDIO.md's playtest cut: a grab, the kennel and a rejoin; a fish carried out under chase. Four clients: a cat carries a fish out with a dog lunging behind it (secured or grabbed: the script decides by distance); a second cat is grabbed, carried to the kennel, tossed in, captured; its client disconnects and reconnects with its name during heist (card 44) and is back in the kennel; a third cat rescues; the host disconnects mid-run and the next host's phase message arrives on time (ADR 0007's sign).

## DoD
- The disconnect is a socket close with no other cleanup, the way a browser tab dies; the reconnect is the ordinary `connect` with the name.

## Acceptance
- Exit 0 at 4 clients; the fish secured on every client at one message, or the cat `held` on every client within 150 ms; the captured cat's rejoin lands captured within 500 ms of its hello on every client; the rescue frees it on all; after the host's disconnect the next phase arrives within 250 ms of its due time; the round tables deep-equal at the end.

## Test
- The scenario is the test; numbers in the report.
