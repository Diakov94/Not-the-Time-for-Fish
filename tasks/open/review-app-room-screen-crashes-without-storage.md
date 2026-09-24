zone: src/app
size: XS
files: src/app/screens/room.ts
# The room screen reads localStorage unguarded: with site data blocked, the first page is blank

`roomScreen` reads and writes `localStorage` four times with no guard. A browser with site data blocked for the origin (Chrome's per-site "block cookies", some private windows) throws `SecurityError` on the first read, and the app dies before its first screen: a dark page, no title, no message, nothing to click. ADR 0012 names the rule (a store may be unavailable: defaults, no throw) and `hud/hints.ts` follows it; the room screen predates it. Card 118 restyles the screen; this is the line it must keep.

## DoD
- The four accesses behind a try/catch each way (a read gives '', a write does nothing), as hints.ts does.

## Acceptance
- With `localStorage` throwing (DevTools: block site data), the room screen shows and a room is created (before: a blank page and an uncaught SecurityError, 1 of 1).

## Test
- None: a guard; the check above is the browser's.
