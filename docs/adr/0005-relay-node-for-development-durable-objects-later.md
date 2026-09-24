---
status: accepted
date: 2026-09-24
---

# One room module, hosted on Node for development and on a Cloudflare Durable Object for the friend group

The relay of ADR 0001 stores nothing beyond room membership and settles contested claims by delivery order. All of that logic lives in one pure module, `src/relay/room.ts`, that knows sockets only as ids and the game payload only as opaque text. It holds the members in join order, names the host (the connected member with the lowest join order), stamps every forwarded envelope with a per-room monotonic `seq`, fans each message out to every member including its sender, and emits three control messages: `welcome` (your id, the members, the host, the current `seq`), `joined {id}` and `left {id, host}`, the last naming the host after the departure. A room is keyed by its code in the URL path and dies with its last member.

The module has two hosts, each a thin adapter from sockets to ids:

- **Development and headless tests: Node with the `ws` package**, on this machine, no account. `npm run relay` serves a port next to `vite dev`, so two browser tabs are two players; the headless runner and the Vitest suite start the same host in-process on an ephemeral port. Start time is milliseconds, so it fits inside the gates.
- **The friend group: a Cloudflare Durable Object**, one per room code, on the WebSocket Hibernation API (`acceptWebSocket`, `getWebSockets`), with member ids in socket tags and `seq` in the object's storage so both survive eviction. The static build is served by the same Worker under the owner's domain, so client and relay share one origin. Durable Objects have been on the Workers Free plan since April 2025: 100,000 requests and 13,000 GB-s a day, with incoming WebSocket messages counted at 20:1. With one `tick` message per client per network tick (ADR 0006), 8 players at 20 Hz are 160 messages/s, 8 billed requests/s, about 29,000 an hour: three hours of play a day fit the free plan, and a 45–90 min session fits with margin.

Until the Durable Object adapter exists, a Prototype session across the internet uses the Node relay on the owner's machine behind a Cloudflare quick tunnel (`cloudflared tunnel --url`: no account, WebSockets supported) or any equivalent tunnel. The adapter is the first relay card of the Vertical Slice, not of the Prototype.

## Considered options

- **PartyKit**: rejected. Cloudflare acquired it in April 2024; its successor `partyserver` is a library over Durable Objects, and its dev server is workerd, which would put a heavy toolchain in front of every headless test for the sake of a relay of about a hundred lines. If the Durable Object adapter grows past the room module itself, `partyserver` is the named shortcut for that adapter only.
- **Durable Objects for development too (`wrangler dev`)**: rejected for the gates. It runs without an account, but it downloads and starts workerd, adds seconds to every test run and ties the tests to Cloudflare's local runtime. Kept for testing the adapter itself.
- **A Node relay on a rented box for the friend group**: not chosen, because GAME.md's "self-hosted domain" may be a static host and this ADR cannot assume a machine that stays on. If the owner runs such a box, the Node host already exists, this option costs nothing, and the Durable Object adapter stays unwritten.
- **A relay that keeps game state (props, ownership)**: out of scope by ADR 0001, not reopened.

## Consequences

- Room membership and the host's identity have one owner, the relay; clients never infer who is in the room from traffic. The host's duties (round state, the joiner's state) are ADR 0006's.
- The room module's whole state is the member list and `seq`, both serialisable, so an evicted Durable Object rebuilds it from socket tags and one storage key. The module must stay that small for the adapter to stay thin.
- Echo doubles each client's own upload as download; at one tick message per client at 20 Hz that is a few KB/s, and it buys a settled claim order without a second mechanism.
- The relay never parses the payload, so a protocol change never touches `src/relay`.

## Refutation sign

The room module needing more state than members and `seq` to work behind hibernation; the Durable Object adapter exceeding the room module in lines; a friend-group session hitting the free plan's daily request cap (the price is then the Workers Paid plan at $5 a month, not a new relay); the Node host and the Durable Object host disagreeing on order or echo when the relay test suite runs against both.
