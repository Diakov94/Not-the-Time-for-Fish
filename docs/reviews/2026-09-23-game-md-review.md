# GAME.md review, 2026-09-23

Scope: a full read of [GAME.md](../../GAME.md) against [CONTEXT.md](../../CONTEXT.md) and the two ADRs in [docs/adr](../adr/), looking for contradictions between sections, gaps a first playtest would hit, and vocabulary drift. Fixes with more than 90 % confidence were applied directly; everything below that threshold is listed under open questions.

## Verdict

The document is coherent and unusually complete for the Idea stage. Every mechanic maps to a pillar, the non-goals are honest, and the vocabulary is already shared with the code. The design risk is low; the real risks are technical (client-authoritative physics in a browser) and production (a hobby project with a five-map release scope). Every number in the doc is an untested hypothesis, and the doc says so with TBD.

## SWOT

### Strengths

- **Sharp identity.** Mines both ways plus physics as radar is a real twist on Ratty Catty, not a reskin. Every mechanic in the table cites a pillar.
- **Honest scope.** Private, no store, no accounts, no anti-cheat, no voice. The browser build means zero install for the friend group.
- **Fairness by structure.** Side swap, identical base kits, consumable perks and resource caps remove the usual asymmetric-game balance debt.
- **Shared language from day one.** CONTEXT.md and two ADRs already exist, which keeps agents and code consistent cheaply.
- **Guaranteed audience fit.** The insider humor is written for a known group, so the "is it funny to them" risk is near zero.

### Weaknesses

- **Nothing has been played.** Prep 45 s, heist 10 min, wiggle-free 8 s, dig-out 60 s, toss 3 m, stun 3 s are all guesses.
- **The best-feeling moments sit on the shakiest tech.** Grab, throw and carry are the core feel, and they run on client-side physics with contested ownership.
- **Two unproven content pipelines.** AI sketch → procedural skeleton → AI detail, and fully procedural audio, with no human artist as a backstop.
- **No solo path.** The game needs three or more friends online at once; only headless clients can run it alone.
- **Ownership.** Owner is TBD on a hobby project whose release scope is five maps, cosmetics and gamepad support.

### Opportunities

- **Cheap new maps.** The theme-agnostic map anatomy means the high-rise, market, farm and yacht are mostly content, not new rules.
- **Balance-free content.** The meme setting is an endless source of cosmetics, emotes and props that never touch balance.
- **Automated multiplayer tests.** Headless clients let agents run regression tests on netcode and physics sync, which is where agent development is strongest.
- **Hardware headroom.** A near-high-end target leaves room for richer physics and effects than the comparable titles.
- **Session stats later.** The two-round match with fish-count scoring is a clean base for a session scoreboard if the group wants one.

### Threats

- **Browser platform.** WebGPU maturity varies, WASM physics has a performance ceiling, and a backgrounded tab throttles the client that owns props.
- **Camping.** Dogs sitting on exits or the kennel can turn rounds into stalls; the mitigations exist on paper only.
- **Snowball and idle time.** Ten-minute rounds plus captures can bench players; kennel rules address it but are untested.
- **Humor ages.** Political memes from the 2000s–2010s fix the audience forever; fine for a closed group, fatal for anything wider.
- **Engine work.** Netcode, animation and procedural audio are the parts where hobby projects stall, and here all three are hand-built.

## Findings fixed

| # | Finding | Section |
| - | ------- | ------- |
| 1 | "Re-mine cleared paths" used *clear*, which CONTEXT.md reserves for a dog removing a trap. Now "the approaches cats have defused". | Core Loop |
| 2 | Mystery bags spawned in "contested areas (house and yard)" while Map Anatomy calls the yard dog territory. Now "in the house and the yard". | Key Mechanics |
| 3 | Friendly fire said traps don't stun their own team; traps stun nobody. Rewritten. | Key Mechanics |
| 4 | Pillar 1 and USP 2 promise noise and evidence from every object, while Networking made small debris local-only with no rule for its noise. Now: debris topples locally under synced bodies, and noise pings are events from the client that caused them. | Key Mechanics, Technical Constraints |
| 5 | Overtime handled one carrier; with passing there can be several. Now it covers every held fish. | Win / Lose |
| 6 | Content Scope listed 1–2 mine/trap types for MVP while Key Mechanics fixes one of each. | Content Scope |
| 7 | Vertical Slice demanded zero visible desync while the MVP criterion allows one per round. Aligned. | Milestones |
| 8 | The success criterion counted rounds, but play is organised in two-round matches. Now two matches back to back. | MVP |
| 9 | "Proximity voice is a release option" contradicted the no-in-game-voice non-goal. Removed. | Risks |
| 10 | Room and lobby were used interchangeably. Room is the group behind a code, Lobby is its screen; usages aligned. | CONTEXT.md, UI, Multiplayer, MVP, Milestones |
| 11 | Two real notes were hidden in HTML comments (distribution, draft bindings). Made visible. | Target Platforms, Controls |
| 12 | The hideout omitted the dig-out tunnel end that CONTEXT.md lists. | Map Anatomy |
| 13 | Dogs were "law-enforcement agencies", but the list includes the emergency service and military intelligence. Now security, law-enforcement and rescue agencies. | USP, Characters |
| 14 | The Decision Log used the avoided term "size-gated routes". | Decision Log |
| 15 | New risks: exit camping (with a new map rule: exits always outnumber dogs), small-group balance at 3–4 players, backgrounded browser tabs. | Map Anatomy, Risks |

## Questions below 90 % confidence, decided on the owner's "decide yourself"

1. **Can a free cat climb the fence?** The fish-carrying rule said a *carrying* cat can't, which implied a free one can, while Map Anatomy, Prep and CONTEXT.md said cats enter and leave through exits. Decided: nobody climbs the fence; exits are the only way in or out, with or without a fish. Mines now matter on the way in, the exit pick in Prep is a real choice, and the opaque fence is consistent.
2. **How is a noise-maker trap triggered?** Decided: the cat that planted it sets it off by hand, from anywhere, with the same button that plants it; one trap in play per cat. A timer reads poorly and dog proximity would make it an alarm rather than a distraction.
3. **Can dogs pick up and throw props other than cats?** Decided: no. Dogs push, barge and carry grabbed cats; only cats carry and throw props. The sides stay distinct in how they touch the world, and it matches "dogs push fish but never pick them up". The dog's lunge-grab moved to the left mouse button, so both sides have their grab on the primary button.

## Deliberately not changed

- The template instructions in the header, the Idea status and the TBD owner: the owner's call.
- Tuning values: TBD by design until the Vertical Slice playtests.
- Which three of the six characters per side ship in MVP: cosmetic, decide at Alpha.
- The dog HUD shows teammate status even though dogs are never grabbed: harmless.
