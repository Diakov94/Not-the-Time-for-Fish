---
status: accepted
date: 2026-09-24
---

# Six code zones, with the simulation runnable in Node

The repository holds no game code yet, and every later batch is cut by zone (`gamestudio/STUDIO.md` §2). The source is cut into six zones. The two that hold the game's facts, `sim` and `net`, never import three.js, the DOM or a browser global, so a headless test client is a player's client minus `render` and `app`, and runs in Node.

| zone | holds | imports |
| --- | --- | --- |
| `src/sim` | the Rapier world and its fixed 60 Hz step (time is passed in; sim never reads a clock), the entity table (the owner of identity: net id, kind, synced or local, home owner), the ownership fold (ADR 0006), the Prototype room's level definition, character movement, grab, carry and throw | `@dimforge/rapier3d-compat` only |
| `src/net` | the game protocol (message kinds and codec), the client over the global `WebSocket`, the join handshake, the ~20 Hz tick sender, the receiver with its interpolation buffer, the state dump shared by the desync hotkey and the headless comparison | `sim` |
| `src/relay` | the pure room module (membership, host, `seq`, fan-out) and its hosts: Node on `ws` now, a Durable Object later (ADR 0005). The game payload is opaque to it | nothing from the game |
| `src/render` | the three.js scene: one `Object3D` per entity in a view map keyed by net id, placeholder geometry per kind, the third-person camera, frame interpolation between the sim's previous and current poses | `sim` (read only), three.js |
| `src/app` | the Vite entry, DOM screens with Ukrainian text, keyboard and mouse input turned into sim intents, the real-time loop with the fixed-step accumulator, the "report desync" hotkey, the wiring of the other zones | everything |
| `tools/headless` | the headless client (`sim` + `net` + a scripted input source), the runner that starts the Node relay on an ephemeral port, drives N clients for S seconds and prints per-entity divergence between clients; the two-client game the gates run | `sim`, `net`, `relay` |

In code, *entity* means a row of that table: a character or a prop. A prop is always called a prop, as CONTEXT.md asks; *entity* is used only where both are meant.

Tests sit next to the code they check as `*.test.ts` and run under Vitest in Node; they count as instruments. The Prototype's only level lives in `src/sim`; a `content/` zone appears with the Vertical Slice's country house, not before. One npm package with path aliases, no workspaces.

The boundary is checked by command, not by promise: `npm run zones` (its one owner is `package.json`) runs inside the gates and must print nothing. It rejects, in `src/sim`, `src/net` and `src/relay`, any import of `three` (`from` or bare `import`), any `document.`, `window.` or `navigator.`, and any path or alias into `render` or `app`.

## Considered options

- **Two zones, `game` and `web`**: rejected. Relay, protocol and physics cards would all land in one zone and serialize on one worker; the cut fails the studio's test that cards from different zones almost never touch the same file.
- **Feature zones (movement, props, grab)**: rejected. Every feature crosses simulation, protocol and display, so every card would touch every zone and every batch would conflict at landing.
- **The simulation in a Web Worker**: not a zone question, and not needed for two players and a dozen props. The cut keeps it possible, since `sim` has no DOM, and nothing in the Prototype pays for it.
- **Workspaces, one package per zone**: rejected. Installing and building several packages on every gate run spends the owner's three-minute ceiling on plumbing.

## Consequences

- The headless test clients GAME.md plans need no browser, no jsdom and no `ws` on the client side: Node 22.4+ ships a stable global `WebSocket` client. `ws` is a dependency of the relay's Node host only.
- Rapier is imported as `@dimforge/rapier3d-compat`, which inlines the WASM as base64 and initialises with one `await init()` in Node and under Vite alike. The price is a larger bundle and a slower first load, both irrelevant for a private link.
- `render` and `app` hold no game fact. A pose read there comes from a Rapier body; a list of entities read there comes from the entity table. A render-side list kept in step by hand is a second owner and is rejected at review.
- The `ZONES` array in `.studio/project.conf` lists these six paths; a card names one of them on its first line.

## Refutation sign

Any of these refutes the cut and reopens this ADR: a Prototype card that must touch three zones to deliver one observable result; either grep above printing a file to make a test pass; the headless client needing a browser or jsdom to run; `@dimforge/rapier3d-compat` failing to initialise under plain `node` in the first card of the sim batch.
