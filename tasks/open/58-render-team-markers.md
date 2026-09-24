zone: src/render
size: S
# Team markers

CONTEXT.md: a team marker is a spot a player marks by hand for their own team. Card 23 makes `mark` an event for the marker's side; render draws a marker at the point, visible through walls as a shape only, for ~10 s, distinct in shape from a noise ping and readable in greyscale.

## DoD
- The marker is drawn from the event list; render keeps its age only; a mark from the other side is never drawn.

## Acceptance
- A cat marks a storage: every cat sees the marker within one frame of the event and no dog does; it is gone at 10 ± 0.5 s; visible through a wall (a screenshot). Before: nothing.

## Test
- None: a browser check named in the report.
