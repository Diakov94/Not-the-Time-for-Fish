# GAME.md

> The single source of truth for the game's vision. Keep it short, concrete and current.
>
> - Replace every `[...]` placeholder. Hints and examples are in `<!-- comments -->`, which don't show when the file is rendered.
> - Sections marked ★ are **required from day one**. Fill the rest as the project matures.
> - Delete any section that doesn't apply. Don't leave it empty.
> - Log every significant change in the [Decision Log](#decision-log).
> - Items marked **TBD** are agreed in principle but not yet detailed.
> - Canonical vocabulary lives in [CONTEXT.md](CONTEXT.md); architecture decisions live in [docs/adr](docs/adr/).

| Status | Last Updated | Owner(s) |
| ------ | ------------ | -------- |
| Idea   | 2026-09-24   | TBD      |

---

## 1. Vision

### Working Title ★

**Не час для рибки** ("Not the Time for Fish")

### One-Sentence Pitch ★

A physics-based multiplayer heist where a gang of meme cats sneaks into a Ukrainian suburban house to steal fish, while a squad of bomb-sniffing guard dogs mines the yard and hunts them down.

### Elevator Pitch

Cats and dogs play asymmetric team hide-and-seek in a fully physical house. The cats scout, sneak, defuse mines and carry fish out one by one. The dogs plant mines, sniff out scent trails and toss grabbed cats into the kennel. Every knocked-over vase makes noise, every plate on the floor is a clue, and every round turns into chaotic slapstick. It is a cartoon satire of 2000s–2010s Ukrainian political memes and everyday life, made for a private group of friends.

### Genre ★

Party / Physics-based Team Hide-and-Seek (Heist vs. Defense)

### Comparable Titles

**"Ratty Catty meets Payday, with mines"**

- Ratty Catty: physics-driven hide-and-seek between cats and rodents, household setting, slapstick chaos.
- Payday / heist games: an objective-driven break-in with multiple entry points and loot to carry out.
- Deliberately different: two teams instead of one hunter vs. many; mining and demining work both ways; several fish instead of a single objective.

### Unique Selling Points

1. **Mines both ways**: dogs mine the perimeter, cats defuse them and plant their own distraction traps, which dogs sniff out and clear.
2. **Physics as a radar**: every object knocked over makes noise and leaves evidence. Stealth means handling the house carefully.
3. **Insider humor**: cats are parodies of Ukrainian political memes, and dogs are named after Ukrainian security and law-enforcement agencies.

### Target Audience

- **Player profile:** a private circle of friends, 3–8 players, Ukrainian-speaking, who play party games on voice chat.
- **Session length:** rounds of 10+ min; a session of 45–90 min.
- **Age rating target:** N/A (private, not publicly distributed).

### Core Player Fantasy ★

- **Cats:** a cheeky gang of burglars pulling off an elaborate fish heist under the dogs' noses.
- **Dogs:** a vigilant special unit that turns the house into a minefield and catches every intruder.

### Pillars ★

1. **Physical chaos is the story**: every object reacts, makes noise and leaves traces. The funniest moments come out of physics, not scripts.
2. **Readable cat-and-mouse**: both sides always have tools to detect and counter each other: noise and scent against hiding, mines against defusing. Every detection tool has a cost and a counter.
3. **Teamwork over solo heroics**: rescuing teammates, passing fish and coordinating exits beat going it alone.
4. **Insider meme humor**: characters, props and names are jokes for "our people". Nothing is taken seriously.

> Every feature must support at least one pillar. If it doesn't, cut it.

### Non-Goals ★

- Not a public release: no store page, no marketing, no IP clearance.
- No monetization, no accounts, no matchmaking with strangers.
- No gameplay bots / single-player mode in MVP. (Headless test clients are dev tooling, not a feature.)
- No in-game voice chat: the group uses its own voice app, one channel per side; a player moves channel when the rotation moves it to the other side.
- No anti-cheat: players are trusted friends, which is what makes client-side physics authority acceptable.
- No realistic violence or blood. Mines are cartoon props, not a war theme.
- No class-based heavy asymmetry: characters differ in looks, not in abilities.
- No localization beyond Ukrainian.

---

## 2. Gameplay

### Core Loop ★

1. **Prep** (45 s, TBD): dogs mine the approaches and set up the yard. Cats are confined to the hideout: they pick the exit to sneak in through and may pre-plant their trap outside the fence.
2. **Infiltrate**: cats sneak in through an exit, defuse mines and avoid making noise.
3. **Steal / Hunt**: cats grab fish and carry them out through the exits; dogs track noise and scent, grab cats and carry them to the kennel.
4. **Rescue / Counter**: cats free captured teammates; dogs guard the kennel and re-mine the approaches cats have defused.
5. **Resolve**: the round ends on a win condition. The rotation picks the next round's dogs and the next round starts.

### Meta Loop

- **MVP:** none. The dogs rotate between rounds; each player's match wins are kept per session.
- **Release:** cosmetic unlocks earned by playing (hats, emotes, meme accessories). Progress is stored locally (`localStorage`); there are no accounts.

### Key Mechanics

| Mechanic | Description | Supports Pillar |
| -------- | ----------- | --------------- |
| Physics objects | Every prop can be pushed and knocked over by anyone; only cats carry and throw props, dogs shove and barge. Collisions make noise. Gameplay-relevant props are synced; small debris is local-only, but the noise it makes is broadcast to everyone. | 1 |
| Noise | Impacts and running emit noise pings that dogs see on screen and hear directionally. Sneaking cats are near-silent. Dogs are always loud: cats hear their steps and panting through walls. | 1, 2 |
| Scent trails | Cats leave scent trails that fade in ~30 s. Sniff (hold) shows trails within ~10 m but slows the dog to a walk. | 2 |
| Hiding spots | Cats hide under furniture, in boxes and behind curtains. Dogs can't fit in, but can wreck the spot: flip the box, pull the curtain, shove the sofa. | 1, 2 |
| Cat routes & doors | Cats fit through cat flaps, vents and gaps under fences and furniture: the quiet way in. Cats open doors slowly and loudly; dogs open them instantly and barge through light barricades. | 2 |
| Movement asymmetry | Dogs are faster on open ground. Cats are faster through clutter and on vertical routes (climbing, tight gaps); the fence is the one thing nobody climbs. | 2 |
| Mines (dogs) | Visible cartoon props that stun (~3 s, TBD) and launch cats. The blast is loud and pings for everyone. Dogs conceal mines with the environment: under rugs, behind doors, in tall grass. Each dog carries 3; a used mine is replaced at the doghouse after ~30 s. MVP has one type (firecracker); water bombs are release scope. | 1, 2 |
| Demining (cats) | Cats defuse mines with a short, interruptible action; a defused mine is gone for good. A sneaking cat gets a whisker-twitch cue within ~2 m of a mine. | 2, 3 |
| Traps (cats) | Cats plant distraction traps and set them off by hand from anywhere, with the same button. A cat has one trap in play at a time, carried or planted; each starts with 1 and more spawn as pickups. Dogs sniff and clear a planted trap before it goes off. MVP has one type (noise maker): a loud noise ping where it sits. Fake scent is the Decoy perk. | 2 |
| Grab & carry (dogs) | A lunge-grab (short cooldown) grabs a cat. The carrying dog walks slowly and can't sniff or plant, but can toss the cat a short distance, e.g. into the kennel hatch; a physics throw can miss. The cat wiggles free after ~8 s; a teammate frees it instantly by hitting the dog with a thrown object. | 1, 3 |
| Fish carrying | Fish are physical objects: carried, dropped, passed or tossed ~3 m between cats, enough for a window or a sofa but never the fence. A carrying cat is slower and, like every cat, leaves only through an exit. A grabbed or stunned cat drops its fish on the spot. Dogs can push fish around but can't pick them up. | 1, 3 |
| Kennel & rescue | Captured cats sit in the kennel. A teammate opens it instantly and frees everyone inside. Alone, a cat digs out after ~60 s through a tunnel that exits outside the fence; each cat has its own timer. Captured cats spectate their teammates. | 3 |
| Perk pickups | Neutral "mystery bags" spawn in the house and the yard. The effect depends on who picks one up and lasts one use or ~30 s. One perk slot: a second bag replaces the first. | 2 |
| Friendly fire | Mines never stun dogs, but the blast impulse pushes everyone, dogs included. Traps make noise and hurt nobody. | 1 |

**Base kit (identical for every character on a side):**

- **Dogs:** run, lunge-grab (carry and toss the cat), sniff (hold), plant mine (3 carried). Dogs push props but never pick them up.
- **Cats:** run, sneak, jump and climb, carry and throw props (fish included), defuse, plant and set off a trap (1 in play).

**Perk pickups (draft, TBD).** All perks are consumables (one use or ~30 s), so nobody snowballs.

| Side | Perk | Effect |
| ---- | ---- | ------ |
| Dogs | Sapper | Two extra mines, faster planting |
| Dogs | Bloodhound | Scent trails stay visible longer |
| Dogs | Bulldog | Longer grab range |
| Dogs | Bark | Flushes cats in a radius out of their hiding spots; they emit a noise ping |
| Cats | Ninja | Silent steps, less noise |
| Cats | Acrobat | Double jump |
| Cats | Decoy | Throws a fake scent lure |
| Cats | Safecracker | Defuses twice as fast, can't be interrupted |

### Map Anatomy

Every map has the same five zones, so the rules stay readable across maps:

1. **Hideout** (outside the fence): cat spawn, drop-off and the far end of the dig-out tunnel. Dogs can't leave the property (they are on duty). A fish counts only when a cat carries it into the hideout.
2. **Fence with 3–4 exits** (gate, gaps, drainpipe): the only way in or out of the property for a cat, with or without a fish, which makes them the prime mine spots. Nobody climbs the fence, and it is opaque: the property can't be watched from the hideout except through the exits. Every map has more exits than the most dogs it hosts (3), so one exit is always unguarded.
3. **Yard** (dog territory): the doghouse for mine resupply, open ground, few hiding spots.
4. **House** (contested): 5 fish in 3+ storages with different access costs, e.g. on the table (easy, in the open), in the fridge (slow and loud), in the aquarium (needs a teammate). Cluttered rooms, hiding spots, cat routes.
5. **Kennel** (next to the doghouse): a cage where captured cats go. Dogs drop cats in through the hatch; a free cat opens the latch from outside. Placed so a dog can carry a cat there from any fish storage within the wiggle-free time; tuned per map.

Each map maps these zones onto its theme. In the high-rise: hideout = the neighbor's balcony, fence = balconies and vents, yard = the hallway.

### Win / Lose Conditions

- **Cats win:** 3 of 5 fish are secured (carried into the hideout).
- **Dogs win:** the heist timer (10 min, TBD) runs out, or all cats are in the kennel at the same time.
- **Overtime:** if the timer runs out while cats are holding fish, the round continues until each held fish is secured or dropped, for at most 60 s. Every carrier emits a continuous noise ping.
- **Capture:** a grabbed cat dropped into the kennel is captured: locked in until a teammate rescues it or it digs out (~60 s). Nobody is eliminated.
- **Match:** as many rounds on one map as the dog rotation needs for every player to play dog at least once with dog counts at most one apart: 3 players → 3 rounds, 4 → 4, 5 → 3, 6 → 3, 7 → 4, 8 → 3. A player scores one point per fish it secures as a cat and one per catch (a cat it dropped into the kennel) as a dog. The top score wins the match; on equal scores, the player whose last point came sooner into its round; still equal, a draw. The session score counts match wins per player.

### Progression

No in-round progression beyond perk pickups. Between sessions: cosmetic unlocks only (release, see Meta Loop).

### Economy

None.

### Onboarding / Tutorial

- Contextual hints during a player's first round (controls, objective, mines).
- Prep doubles as a safe moment to learn the controls.
- No separate tutorial map.

### Game Feel

- Snappy, responsive movement; physics that is exaggerated and bouncy rather than realistic.
- Juice: comic "boom" puffs on mines, ragdoll tumbles, cartoon impact stars, camera shake on explosions.
- Pacing: tense sneaking punctuated by loud chaotic chases. Clean routes are slow and fast routes are noisy; the timer forces cats to take risks.

---

## 3. Presentation

### Setting & Narrative

- **World:** Ukrainian suburbia and city life: a country house with a yard, a high-rise apartment with balconies; later a fish market, a farm and a yacht.
- **Story premise:** no narrative. A gang of meme cats wants the fish; the dogs of the "agencies" won't allow it.
- **Tone:** cartoon satire, whimsical and chaotic, no blood.

### Characters

**Cats**: parody nicknames based on 2000s–2010s Ukrainian political memes. They differ only in looks and emotes.

- Проффесор (Proffesor): a cat in an academic cap.
- Золотий Батон (Golden Loaf)
- Страус з Межигір'я (The Mezhyhirya Ostrich)
- Яйце (The Egg): wobbles and topples dramatically in its emotes (cosmetic only).
- Льоня Космос (Lyonya Kosmos): the dancing cat.
- Коса (The Braid): a cat with a braid crown.

**Dogs**: a play on the Ukrainian sapper dog Patron, named after Ukrainian security, law-enforcement and rescue agencies. They differ only in looks and emotes. Spellings TBD.

- ГАВ-БУ (SBU)
- НАБУ-ГАВ (NABU)
- ДБР-р-р (DBR)
- ДСНС-ик (DSNS, the real demining service)
- ГУР-р (HUR)
- ДПСУ-шка (DPSU, border guard)

### Art Direction

- **Style:** stylized low-poly, flat shading.
- **References:** Ratty Catty, Untitled Goose Game, Totally Accurate Battle Simulator.
- **Palette:** warm, homey colors. Ukrainian domestic details: embroidered cloth on furniture, rugs on walls, grandma's china cabinet.
- **UI mood:** chunky, playful, readable at a glance.
- **Pipeline** (no image model anywhere: the studio's workers generate no raster):
  1. A design agent writes the concept: silhouette, proportions, palette slots, one signature detail per character or prop, and an SVG sketch where a picture helps.
  2. A procedural-geometry skeleton is built in code from the concept.
  3. Detail is added by code: flat palette shaders, procedural patterns (embroidery, rugs, tiles) generated in shaders or on a canvas, SVG decals, and Blender renders through MCP where assembly needs a tool. Everything is normalized to the shared palette.

### Audio Direction

- **Music:** procedurally generated; adaptive to the round phase (calm prep → tense infiltration → frantic chase).
- **SFX:** procedurally generated; priority on gameplay-relevant feedback: impacts (noise), mine arm/defuse/blast, grabs, fish pickup, dog steps and panting.
- **Ambience:** procedural household and yard ambience.

### Camera

- **Dimension:** 3D
- **Perspective:** third-person
- **Behavior:** player-controlled orbit camera following the character, with tight collision against walls. In a hiding spot the camera switches to a fixed peek view, so cats can't look through walls.

### Controls

| Action | Keyboard & Mouse | Gamepad (release) |
| ------ | ---------------- | ----------------- |
| Move | WASD | Left stick |
| Camera | Mouse | Right stick |
| Sprint | Shift | L3 |
| Sneak (cats) | Ctrl (toggle) | R3 (toggle) |
| Jump / climb (cats) | Space | A |
| Grab / carry / throw: props for cats, a grabbed cat for dogs | LMB | RT |
| Plant mine / trap; set off a planted trap (cats) | Q | LB |
| Sniff (dogs) / Defuse (cats) | E (hold) | X (hold) |
| Interact (doors, storages, kennel) | E (tap) | X (tap) |
| Use perk | F | RB |
| Mark (team marker) | MMB | View |
| Emote | 1–4 | D-pad |

Bindings are a draft; finalize them during the Prototype milestone.

### UI / HUD

- **Always on screen:** phase and its timer, fish counter (secured / remaining), carried items (mines / traps / perk), teammate status (free / grabbed / captured).
- **Contextual:** noise pings and scent overlay (dogs), whisker cue and defuse progress (cats), team markers, overtime warning.
- **Kennel:** captured cats spectate a teammate or free-look around the kennel.
- **Menus:** main menu → create or join a room by code → lobby (the roster with the next round's dogs, map pick, voice-channel reminder) → match (its rounds, the dogs rotating between them) → results → back to the lobby.

### Accessibility

- [x] Remappable controls
- [ ] Subtitles / captions (no voice-over planned)
- [x] Colorblind-friendly side colors and noise/scent overlays
- [ ] Difficulty / assist options (N/A, PvP)
- [x] Text size / UI scaling
- [x] Reduced motion / screen-shake toggle
- [x] Sound visualization toggle: directional noise cues on the HUD

### Localization

Ukrainian only.

---

## 4. Production

### Target Platforms ★

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] iOS
- [ ] Android
- [x] Web: desktop browsers (Chrome, Firefox, Edge). Safari is not supported.
- [ ] Console

Distribution: a private link on a self-hosted domain; friends join by room code.

### Engine / Stack ★

- **Engine:** Three.js, `WebGPURenderer` with a WebGL2 fallback.
- **Language:** TypeScript.
- **Build tool:** Vite.
- **Key libraries / plugins:**
  - Rapier (WASM) for physics.
  - No ECS library in the Prototype: a plain entity table; miniplex if its refutation sign shows ([ADR 0004](docs/adr/0004-no-ecs-for-the-prototype.md)).
  - A WebSocket room relay: one room module, hosted on Node for development and tests; a Cloudflare Durable Object is proposed for the friend group, the owner decides at the Vertical Slice ([ADR 0005](docs/adr/0005-relay-node-for-development-durable-objects-later.md)).
- **Version control & asset pipeline:** Git. Models are glTF produced by the concept → procedural skeleton → code-detail pipeline; no image model. Audio is generated at runtime.
- **Development:** built by a multi-agent AI system. Text-based formats and clear module boundaries are required.

### Technical Constraints

- **Performance target:** 60+ FPS on near-high-end desktop PCs (discrete GPU).
- **Build size budget:** not a hard constraint. Keep initial load reasonable (TBD).
- **Save system:** local only (`localStorage`); no cloud saves or accounts.
- **Analytics / telemetry:** none.
- **Networking:**
  - Physics runs on the clients, with authority by ownership: the player who grabs or pushes an object becomes its authority, and the others receive events and snapshots. The relay's message order settles contested ownership claims.
  - Only gameplay-relevant props are synced (fish, mines, traps, hiding spots, large furniture); small debris is local-only cosmetic and topples on each client under the synced bodies that hit it. Noise pings are events broadcast by the client that caused them, so every dog sees the same ping. Objects at rest send nothing.
  - Tick rates: physics 60 Hz, network snapshots ~20 Hz.
  - Data travels through a WebSocket relay with rooms; players join a room by code.
- **Testability:** headless test clients for automated multiplayer and physics-sync tests; a "report desync" hotkey dumps the local snapshot for comparison between clients.

### Monetization

None. This is a private hobby project.

### Multiplayer / Online

- Online team PvP, 3–8 players, in private rooms joined by room code.
- Auto-balance of about 1 dog per 2 cats, picked anew every round: 3 → 1 vs 2 · 4 → 1 vs 3 · 5 → 2 vs 3 · 6 → 2 vs 4 · 7 → 2 vs 5 · 8 → 3 vs 5. There are no fixed teams: the dogs rotate so that every player plays dog as equally as possible across the match (the players with the fewest dog rounds this match first, in join order). The host does not reassign by hand.
- Balance knobs that scale with player count: mines per dog, heist timer, kennel dig-out time.
- Disconnects: the character freezes in place for 60 s (a carried fish drops, a carried cat is released); the player can rejoin by room code into the same round; after that the character is removed. No mid-round rebalancing.
- Host migration: the relay keeps the room alive; if the host leaves, the next player becomes host.
- No matchmaking, no leaderboards, no bots. Voice is external, one channel per side.

### MVP ★

- 1 playable map (country house) with the full round structure (prep → heist → overtime).
- Both sides with their full base kit: mines, demining, traps, sniff, sneak, grab, kennel, rescue and dig-out.
- Map anatomy in place: hideout, fixed exits, 3+ fish storages, hiding spots, cat routes.
- 5 physical fish, all win conditions and the match over the dog rotation with its per-player score.
- Noise and scent systems.
- 4 perk pickups per side.
- Private rooms by code over the WebSocket relay, 3–8 players, with a lobby and rejoin.
- Keyboard & mouse only; placeholder art and procedural audio.

<!-- The smallest playable build that proves the core loop is fun. No polish, no meta. -->

**Success criteria:**

- A group of 6 friends plays 2 matches back to back and asks for a third without being prompted.
- At most one visible desync per round (an object or player clearly in a different place for two players), checked with the desync report hotkey.

### Content Scope

| Content                  | MVP                              | Release                                          |
| ------------------------ | -------------------------------- | ------------------------------------------------ |
| Maps                     | 1 (country house)                | 5 (+ high-rise, fish market, farm, yacht)        |
| Cat characters (visual)  | 3                                | 6+                                               |
| Dog characters (visual)  | 3                                | 6                                                |
| Perk pickups             | 4 per side                       | TBD                                              |
| Mine / trap types        | 1 per side (firecracker, noise maker) | 2+ per side (+ water bomb, TBD)             |
| Cosmetics                | 0                                | TBD                                              |
| Playtime                 | One 45–90 min session with friends | Replayable sessions                            |

### Milestones

Dates are TBD. Progress is measured by readiness, not by calendar. From Vertical Slice on, every milestone ends with a playtest with the friend group.

| Milestone      | Goal / Definition of Done | Target Date | Done |
| -------------- | ------------------------- | ----------- | ---- |
| Prototype      | 2 players online in one room: movement, physics props with ownership sync, grab & carry. | TBD | [ ] |
| Vertical Slice | Country house map, full round with mines, demining, fish, exits, hiding spots, kennel and rescue; 6 players with at most one visible desync per round. | TBD | [ ] |
| Alpha          | MVP scope complete: 1 map, all mechanics, perks, noise and scent, procedural audio, rooms with rejoin. | TBD | [ ] |
| Beta           | Final art pipeline applied, full Ukrainian UI, MVP success criteria met in playtests; second map (high-rise) proves the map anatomy on a new theme. | TBD | [ ] |
| Release        | 5 maps, cosmetics, gamepad support, stable sessions for the friend group. | TBD | [ ] |

### Risks & Open Questions

| Risk / Question | Impact | Mitigation / Next Step |
| --------------- | ------ | ---------------------- |
| Client-side physics with ownership desyncs: stacked objects, contested grabs. | H | Prototype ownership sync first; sync only gameplay-relevant props; let the relay's message order settle contested claims; fall back to host-authoritative mode if needed. |
| Kennel camping and snowballing (one capture leads to the next). | M | Instant rescue, solo dig-out that exits outside the fence, spectating; tune the dig-out time. |
| A cat rush at round start beats the defense before mines matter. | M | Fish sit in storages with access costs; carrying slows cats; exits are chokepoints. Tune in Vertical Slice. |
| 10+ min rounds feel long for captured or idle players. | M | Kennel rescue and dig-out keep captured cats involved; tune the timer in playtests. |
| Procedural art reads as bland or samey across characters and maps. | M | Lock the palette and style guide early; one signature detail per character in the concept; procedural skeletons enforce proportions. |
| Procedural audio sounds cheap or repetitive. | M | Prototype the key SFX (impacts, mines) early; keep a fallback to CC0 samples. |
| Third-person camera lets players peek through walls and over fences. | L | Tight camera collision; peek view in hiding spots; accept the rest as party-game slack. |
| Fish thrown over the fence bypass the exits. | L | Toss range is ~3 m; keep every fence taller than the toss arc. |
| Both sides share one voice channel and leak information. | L | Lobby reminder to split channels and to move when the rotation moves you. |
| WebGPU support or stability varies between browsers. | L | WebGL2 fallback path; test on Chrome, Firefox and Edge. |
| Final perk list, mine/trap types, dog name spellings. | L | Decide during Vertical Slice playtests. |
| ECS library and relay provider choice. | L | Decided for the Prototype: no ECS (ADR 0004); room module on Node, Durable Object proposed for the friend group (ADR 0005). |
| Prep feels idle for cats. | L | Prep is 45 s; cats pick their exit and may pre-plant a trap. Tune in playtests. |
| The country-house map anatomy may not generalize to other themes. | L | The high-rise in Beta is the test; zone rules in Map Anatomy are theme-agnostic by design. |
| Dogs camp the exits and win on the timer. | M | Exits always outnumber dogs, so one is unguarded; traps and the Decoy perk pull dogs off an exit; tune in Vertical Slice. |
| Small groups (3–4 players) play a very different game from 8. | M | Balance knobs scale with player count; 1 vs 2 is playtested as a first-class configuration, not a fallback. |
| A backgrounded browser tab throttles its client, so the props it owns stall for everyone. | M | Treat a stalled client like a disconnect: its character freezes, anyone who touches its props takes ownership, and it resyncs from others' snapshots when the tab returns. |

---

## Decision Log

| Date       | Decision | Reason |
| ---------- | -------- | ------ |
| 2026-09-23 | Ratty Catty formula with its own theme: meme cats steal fish, agency guard dogs defend. | Proven formula plus insider humor for the friend group. |
| 2026-09-23 | Team vs. team, about 1 dog per 2 cats, 3–8 players. | Party play with friends; ratio balances hunters against thieves. |
| 2026-09-23 | Identical base kits per side; variety comes from perk pickups on the map. | Role classes depend too much on player count. |
| 2026-09-23 | Mines and traps work both ways. | Core identity inspired by the sapper dog Patron; symmetric counterplay. |
| 2026-09-23 | Captured cats go to the kennel and can be rescued. | Long rounds must not bench players. |
| 2026-09-23 | 5 fish, 3 needed to win; rounds of 10+ min with prep, heist and overtime phases. | Intermediate goals keep long rounds tense. |
| 2026-09-23 | Browser only; Three.js + TypeScript + Vite + Rapier + ECS; WebGPU with WebGL2 fallback. | Code-first, text-based stack suits multi-agent development; zero install for friends. |
| 2026-09-23 | Client-side physics with ownership, WebSocket relay rooms, lobby by room code. | No paid game servers; simple NAT-free connectivity for a friend group. |
| 2026-09-23 | Private game, Ukrainian only, no monetization. | Hobby project for a closed group; IP and localization are not concerns. |
| 2026-09-23 | Art: design-agent sketches → procedural skeleton → AI detail. Audio fully procedural. | Content is produced by agents without human artists. |
| 2026-09-23 | Target near-high-end PCs. | The player group has strong hardware; this allows richer physics and effects. |
| 2026-09-23 | Fish count only in the hideout; a carrying cat can't climb the fence and must use 3–4 fixed exits; dogs can't pick fish up or leave the property. | Gives dogs defendable chokepoints and makes mines matter. |
| 2026-09-23 | Kennel: instant rescue by a teammate; solo dig-out after ~60 s exits outside the fence; captured cats spectate. | Caps benching time and makes kennel camping unprofitable. |
| 2026-09-23 | Sniff slows the dog; dogs are always loud; cats can sneak; mines are visible props hidden with the environment; cat routes. | Every detection tool has a cost and a counter (pillar 2). |
| 2026-09-23 | Match = 2 rounds with sides swapped; neutral consumable perk pickups; no friendly stun, blast impulse for all; resource limits on mines and traps. | Fairness in an asymmetric game, no snowballing, comedy without griefing. |
| 2026-09-23 | No in-game voice, no anti-cheat, headless test clients and a desync report hotkey. | Trusted friend group; automated testing for an agent-built multiplayer game. |
| 2026-09-23 | Prep is 45 s with cats confined to the hideout behind an opaque fence; one mine type and one trap type in MVP; grabbed or stunned cats drop fish; fish toss ~3 m, never over the fence; dogs push but never carry fish; dogs can toss a grabbed cat; per-cat dig-out timers; one perk slot; ties go to the faster last fish; kennel within carry range of every storage. | Closes the rules the first playtest would hit immediately, keeping each one physical and readable. |
| 2026-09-23 | Canonical vocabulary in CONTEXT.md (team vs side, exit, secured fish, grabbed vs captured, cat route, noise ping vs team marker); architecture decisions in docs/adr. | One language for the doc, the agents and the code. |
| 2026-09-23 | A defused mine is gone for good; Bark stays a perk and flushes hiders instead of stunning; cats open doors slowly and loudly, dogs instantly; MVP is one map, the high-rise moves to Beta. | Keeps demining simple, keeps hiding meaningful, keeps cat routes the quiet way in, and proves the loop before generalizing the map anatomy. |
| 2026-09-23 | Review pass: overtime covers every held fish; noise pings are events from the causing client even for local-only debris; room (the group behind a code) vs lobby (its screen); one mine and one trap type in MVP; the success criterion counts matches; exits always outnumber dogs. | Removes contradictions between sections and closes gaps a first playtest would hit. |
| 2026-09-23 | Nobody climbs the fence: exits are the only way in or out for cats, with or without a fish. A trap is set off by hand by the cat that planted it, one trap in play per cat, same button as planting. Only cats carry and throw props; dogs push, barge and carry grabbed cats. | Mines matter on the way in as well as out, the trap is a real distraction rather than an alarm, and the sides stay distinct in how they touch the world. |
| 2026-09-24 | Art pipeline without an image model: concept (text and SVG) → procedural skeleton → detail by code (palette shaders, procedural patterns, SVG decals, Blender renders). | The studio runs on Claude models only, which generate no raster; flat-shaded low-poly needs none. |
| 2026-09-24 | Prototype architecture: six code zones with the simulation runnable in Node, no ECS library, one relay room module hosted on Node for development, ownership as one fold over the relay's order (ADRs 0003–0006). | Retires the ECS and relay TBDs the Prototype was to decide; a browser-free simulation keeps headless test clients and playtests cheap. |
| 2026-09-24 | No fixed teams: the dogs are picked anew every round at the 1:2 ratio and rotate so every player plays dog as equally as possible; a match lasts as many rounds as that needs (3 → 3, 4 → 4, 5 → 3, 6 → 3, 7 → 4, 8 → 3); the score is per player, fish secured as a cat plus catches as a dog; the session counts match wins per player. | Fixed teams swapping sides broke the ratio in round 2 (8 players: 5 dogs vs 3 cats) and the rule that exits outnumber the dogs; a rotation keeps every round at the ratio. |
