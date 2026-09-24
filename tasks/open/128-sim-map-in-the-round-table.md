zone: src/sim
size: L
files: src/sim/messages.ts, src/sim/round.ts, src/sim/round.test.ts, src/sim/world.ts, src/net/client.ts
# The round table owns the picked map; the world follows it at prep

GAME.md, Menus: the host picks the map in the lobby. ADR 0007: a fact every client must agree on is the round table's, from a message. Today the level is given to `connect` and built once. The maps are files by name (card 101).

## DoD
- `map {name}` from the host, in the lobby only, for a name this client has a level for (else refused with a named reason); the round table holds `map`; `state` carries it.
- `connect(url, level, name)` keeps its signature (the headless runner is untouched) and takes an optional record of more levels by name; the app passes the maps its glob found. At `prep`, if the table's map is not the one the world was built from, the world is rebuilt from it (the entity and ownership tables are cleared at prep anyway, ADR 0007); the mechanism (a new World or a rebuild in place) is the Developer's, said in the report.
- Render draws the old level until card 142 lands; the card names this.

## Acceptance
- Two headless clients, the host picks `prototype-room` (content's second level): at prep both worlds hold its 10 crates (10 of 10) and the round tables agree; a joiner mid-round builds the same map from `state` (entity counts equal).

## Test
- The fold: `map` from a non-host rejected, from the host outside the lobby rejected, an unknown name refused with the reason; red without.
