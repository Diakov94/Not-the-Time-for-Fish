zone: src/app
size: S
files: src/app/main.ts
# A stalled or hidden host tab holds the round's clock for everyone; a stalled tab's own timer lies

Found by the shell review of 2026-09-24, in headless Chrome with three tabs in one room. The app's loop steps the sim only from `requestAnimationFrame`, which a hidden tab never gets, and clamps a long frame to 0.25 s (`MAX_FRAME`). The sim's time is stepped time (ADR 0003), a phase's start is sim time (ADR 0007) and the host's clock duty runs inside `step`, so a tab that gets no frames stops the clock it holds:

- the host's tab stalled 8 s in prep (a busy loop; a hidden tab is the same to the loop): the other two tabs' prep timer read 0:00 for 7.8 s before the heist began, since the host sent `phase` 7.8 s late. GAME.md's risk row ("treat a stalled client like a disconnect") covers its character, which freezes as designed, not its clock duty;
- the stalled tab's own timer read 0:43 while the others read 0:35: wrong by the stall until the next `phase`, on any client that stalls, host or not.

A tab hidden for a minute (the voice app, a second screen) does the same for a minute. Chrome pauses rAF in hidden tabs and throttles timers to one a second; WebSocket messages still arrive, so the fold and the host's `state` answers keep working, only the stepping stops.

Owners: real time reaches the sim through the app's loop alone; the sim never reads a clock (ADR 0003). The fix is the loop's: when a frame comes after a gap, pass the whole gap rather than 0.25 s of it (a 60 s gap is 3600 sim steps: name their cost, and cap only if it is more than a frame), and keep stepping while hidden from a 1 s `setInterval`, Chrome's throttled rate, so the host's clock is at most a second late. No new fact and no new owner: the phase start stays sim time, `clock` still sends `phase`.

## DoD
- After a gap of N s the sim's time has advanced N s within one frame of the tab's return; while the tab is hidden the loop steps at Chrome's throttled rate.
- The sim, net and round table are untouched.

## Acceptance
- The host's tab stalled 8 s in prep: the other clients' prep ends ≤ 1.0 s late (before: 7.8 s); the stalled tab's timer is within 1 s of the others one frame after the stall (before: 8 s off).
- The host's tab hidden 30 s in heist: the phase's end arrives ≤ 2 s late on the others (before: 30 s).

## Test
- None beyond the two measurements in two tabs: the mechanism is the loop's, and the sim's step is already tested with any dt.
