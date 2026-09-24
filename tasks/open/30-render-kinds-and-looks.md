zone: src/render
size: L
# Every kind drawn, and six looks

Card 20 declares the MVP's kinds; render draws each with placeholder geometry: a cat and a dog told apart at a glance and by size, a fish, a mine (a cartoon firecracker), a trap (a noise maker), a mystery bag, a lure, and content's props from their own shapes and labels (a box is a box; a label render knows gets a nicer placeholder, an unknown label the plain shape in a default colour). Six looks as procedural low-poly skeletons per GAME.md's pipeline and Characters: Проффесор, Золотий Батон, Страус з Межигір'я for cats, ГАВ-БУ, НАБУ-ГАВ, ДБР-р-р for dogs, each with its one signature detail from a one-paragraph concept in the report; the look comes from the roster (card 25) when it lands, and until then from a hash of the client id, so two tabs already show two cats.

## DoD
- Render keeps its view map by net id and nothing else (ADR 0003); the kind and the look are read from the entity table and the roster, never copied.
- A kind or label render has no geometry for is still drawn (its collider's shape), never invisible.

## Acceptance
- In two tabs: a cat and a dog are told apart at 10 m by silhouette, not colour; a fish is recognisable at 5 m; the six looks are six different silhouettes at 5 m (a screenshot of all six in a row, one per look).
- 60+ FPS in both tabs with the country house's props drawn (card 31) and 8 characters; p99 frame ≤ 16 ms.

## Test
- None: browser numbers and two screenshots in the report.
