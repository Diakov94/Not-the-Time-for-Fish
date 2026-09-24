zone: src/app
size: L
# The lobby

GAME.md, Menus and CONTEXT.md: the lobby is the room's screen between matches: team assignment, the map pick, the voice-channel reminder. After the room screen (card 50 adds the name) the lobby shows the roster (card 25) as two columns, cats and dogs, with names and looks; the host moves a name to the other column by a click (a `roster` message), picks the map (one in the MVP, shown as picked), and starts the match (`phase prep`); everyone else sees the columns change and waits; the reminder to split into two voice channels is one line. Looks: a player picks one of three per side (card 25's `look`, card 30's geometry) before the start, and the pick shows in its column. All text in Ukrainian; the room code stays visible for latecomers.

## DoD
- The screen shows the roster and sends messages; it keeps no roster of its own and never decides a team (the host's client decides through the sim's messages, the screen only clicks).
- Non-hosts see no controls they cannot use; the host's controls are labelled as the host's.

## Acceptance
- Six tabs: every tab shows 2 dogs and 4 cats within 1 s of the last join; the host moves one player: all six agree within 500 ms; a non-host's click changes nothing.
- The host starts: every tab leaves the lobby for the round within 1 s; after the match, every tab is back in the lobby with the session score shown (card 48).
- Layout: the six names and looks fit at 1280×720 without overlap; the worst margin named.

## Test
- None: a six-tab check and two screenshots in the report.
