# Не час для рибки (Not the Time for Fish)

The shared language of the game: a physics-based team hide-and-seek heist in which meme cats steal fish from a property guarded by dogs. GAME.md, code, content and agents all use these terms.

## Players and sides

**Side**:
One of the two roles a player plays in a round: Cats or Dogs; the rotation changes a player's side between rounds.
_Avoid_: faction, role, class

**Team**:
The players on one side in one round, teammates to each other. There is no fixed team: the rotation picks the dogs anew every round, and the cats are everyone else.
_Avoid_: squad, party, side, team A/B

**Cat**:
A player on the thieving side; enters the property to steal fish.
_Avoid_: thief, attacker, rat, mouse

**Dog**:
A player on the guarding side; never leaves the property and never picks up a prop.
_Avoid_: guard, hunter, seeker, defender

**Character**:
The look and emotes a player picks on a side (e.g. Проффесор, ГАВ-БУ); cosmetic only.
_Avoid_: class, hero, skin, role

**Base kit**:
The abilities every character on a side has.
_Avoid_: loadout, class kit

**Host**:
The player who created the room; picks the map and starts the rounds.
_Avoid_: owner, admin, leader

**Room**:
The private group of players behind a short room code, from its creation until the last player leaves.
_Avoid_: server, session, game, lobby (the lobby is the room's screen)

**Lobby**:
The screen a room shows between matches: the roster with the next round's dogs, map pick, voice-channel reminder.
_Avoid_: menu, waiting room, room

## Structure of play

**Session**:
One sitting of the friend group; a series of matches, match wins counted per player.
_Avoid_: game night, evening

**Match**:
As many rounds on the same map as the rotation needs for every player to play dog at least once with dog counts at most one apart (3 players → 3 rounds, 4 → 4, 5 → 3, 6 → 3, 7 → 4, 8 → 3); decided by the top player score.
_Avoid_: game, set

**Rotation**:
The rule that picks each round's dogs at the 1:2 ratio: the players with the fewest dog rounds this match first, in join order.
_Avoid_: auto-balance (the ratio alone), swap, shuffle, reassignment

**Score**:
A player's points in a match: one per fish secured as a cat, one per catch as a dog.
_Avoid_: points, kills, team score

**Round**:
One heist on one map: prep, heist and, if needed, overtime.
_Avoid_: level, game, map

**Prep**:
The opening phase (~45 s): dogs mine the property while cats are confined to the hideout.
_Avoid_: setup, warm-up, preparation phase

**Heist**:
The main phase, bounded by the heist timer: cats steal, dogs hunt.
_Avoid_: main phase, raid, attack phase

**Heist timer**:
The clock of the heist; dogs win when it runs out.
_Avoid_: round timer, match timer

**Overtime**:
Up to 60 s after the heist timer while a cat still holds a fish.
_Avoid_: extra time, sudden death

## Map

**Property**:
Everything inside the fence: yard, house, doghouse and kennel. Dogs never leave it.
_Avoid_: base, dog territory, map interior

**Hideout**:
The cat zone outside the fence: cat spawn, fish drop-off and the dig-out exit.
_Avoid_: outer ring, cat base, safe zone, spawn

**Fence**:
The opaque boundary of the property (balconies and vents in the high-rise). Nobody climbs it.
_Avoid_: wall, perimeter, boundary

**Exit**:
An opening in the fence: gate, gap or drainpipe. The only way in or out of the property for a cat, with or without a fish.
_Avoid_: entry point, entrance, chokepoint, gate (a gate is one kind of exit)

**Yard**:
The open ground between the fence and the house.
_Avoid_: garden, lawn, outside

**House**:
The contested building that holds the fish storages.
_Avoid_: building, interior, indoors

**Storage**:
A place in the house where a fish starts, each with its own access cost: table, fridge, aquarium.
_Avoid_: stash, cache, container, fish spawn

**Doghouse**:
Where dogs resupply mines.
_Avoid_: kennel, base, dog spawn

**Kennel**:
The cage next to the doghouse where captured cats are held: dogs drop cats in through the hatch, free cats open the latch from outside.
_Avoid_: doghouse, cage, prison, jail

**Hiding spot**:
A place only a cat fits into. Dogs can't enter it but can wreck it.
_Avoid_: cover, hideout, hidey-hole

**Cat route**:
A passage only cats fit through: cat flap, vent, gap under a fence or furniture.
_Avoid_: size-gated route, shortcut, hole, tunnel (the tunnel is the dig-out)

## Objects

**Prop**:
Any physical object in the world. Anyone can push or knock it over; only cats carry and throw it.
_Avoid_: object, item, entity

**Fish**:
The loot: a prop only cats can carry. Five per round, three secure the win.
_Avoid_: loot, objective, item

**Mine**:
A dog's cartoon explosive prop: visible, concealed with the environment, stuns and launches cats.
_Avoid_: bomb, explosive, trap

**Defuse**:
A cat's short, interruptible action that removes a mine for good.
_Avoid_: disarm, demine, clear (clearing is what dogs do to traps)

**Trap**:
A cat's distraction device (a noise maker) that the cat plants and later sets off by hand; dogs sniff it out and clear it first. One in play per cat.
_Avoid_: mine, lure, decoy (Decoy is a perk)

**Clear**:
A dog's action that removes a cat's trap.
_Avoid_: defuse, disarm, remove

**Mystery bag**:
A neutral pickup that grants a perk to whoever takes it.
_Avoid_: power-up, crate, loot box

**Perk**:
A consumable effect from a mystery bag: one use or ~30 s. One slot per player.
_Avoid_: ability, buff, skill, power-up, class perk

## Detection

**Noise ping**:
The automatic on-screen marker dogs get at the source of a loud event.
_Avoid_: ping, sound marker, alert

**Scent trail**:
The fading trace (~30 s) a cat leaves behind, visible to a sniffing dog.
_Avoid_: footprints, tracks, trail

**Sniff**:
A dog's held action: reveals scent trails and traps nearby and slows the dog to a walk.
_Avoid_: smell, scan, detect

**Sneak**:
A cat's slow, near-silent movement mode; the only mode with the whisker cue.
_Avoid_: crouch, stealth, tiptoe

**Whisker cue**:
The hint a sneaking cat gets within ~2 m of a mine.
_Avoid_: mine detector, radar, sixth sense

**Team marker**:
A spot a player marks by hand for their own team.
_Avoid_: ping, waypoint, beacon

## States and outcomes

**Grabbed**:
A cat held by a dog. It wiggles free after ~8 s or is freed by a teammate.
_Avoid_: caught, captured, carried, held

**Captured**:
A cat locked in the kennel.
_Avoid_: caught, grabbed, jailed, eliminated

**Stunned**:
A cat briefly unable to act after a mine blast; it drops its fish.
_Avoid_: knocked out, dazed, disabled

**Rescue**:
A free cat opening the kennel, which frees every captured cat at once.
_Avoid_: unlock, release, jailbreak

**Dig-out**:
A captured cat's solo escape through the tunnel to the hideout after its own ~60 s timer.
_Avoid_: respawn, escape, timeout

**Secured**:
A fish that a cat has carried into the hideout; only secured fish count.
_Avoid_: stolen, scored, delivered, extracted

**Catch**:
A capture credited to the dog that last held the cat; a dog's point.
_Avoid_: kill, capture (the cat's state), grab
