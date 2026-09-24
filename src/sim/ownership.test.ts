import { expect, test } from 'vitest';
import type { ClientId, NetId, Spawn } from './entities.ts';
import { fold, newOwnershipTable, type FoldMessage } from './ownership.ts';

const at = { x: 0, y: 1, z: 0 };
const crate = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'crate', home: null, p: at });
const character = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'character', home: from, p: at });
const grab = (from: ClientId, id: NetId): FoldMessage => ({ type: 'claim', from, id, hold: true });
const touch = (from: ClientId, id: NetId): FoldMessage => ({ type: 'claim', from, id, hold: false });
const release = (from: ClientId, id: NetId): FoldMessage => ({ type: 'release', from, id, p: at, q: { x: 0, y: 0, z: 0, w: 1 }, v: at });

// Folds a relay order into a fresh table; the homes come from the spawns, as the entity table's do.
function foldAll(order: FoldMessage[]) {
  const homes = new Map(order.flatMap((m) => (m.type === 'spawn' ? [[m.id, m.home] as const] : [])));
  const t = newOwnershipTable();
  for (const m of order) fold(t, m, (id) => homes.get(id) ?? null);
  return t;
}

test('two simultaneous grabs: the first delivered wins', () => {
  const t = foldAll([crate('H', 'H:0'), grab('A', 'H:0'), grab('B', 'H:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: true });
});

test('a touch claim on a held prop is rejected', () => {
  const t = foldAll([crate('H', 'H:0'), grab('A', 'H:0'), touch('B', 'H:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: true });
});

test('a touch claim on a character is rejected', () => {
  const t = foldAll([character('A', 'A:0'), touch('B', 'A:0')]);
  expect(t.rows.get('A:0')).toEqual({ owner: 'A', held: false });
});

test('only a grab takes a character, and its release returns it home', () => {
  const order = [character('A', 'A:0'), grab('B', 'A:0')];
  expect(foldAll(order).rows.get('A:0')).toEqual({ owner: 'B', held: true });
  expect(foldAll([...order, release('B', 'A:0')]).rows.get('A:0')).toEqual({ owner: 'A', held: false });
});

test("left: the leaver's props go to the host; a character the leaver carried goes back to its home", () => {
  const t = foldAll([
    crate('H', 'H:0'),
    crate('H', 'H:1'),
    character('A', 'A:0'),
    character('B', 'B:0'),
    touch('B', 'H:0'),
    grab('B', 'H:1'),
    grab('B', 'A:0'),
    { type: 'left', id: 'B', host: 'H' },
  ]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'H', held: false });
  expect(t.rows.get('H:1')).toEqual({ owner: 'H', held: false });
  expect(t.rows.get('A:0')).toEqual({ owner: 'A', held: false });
  expect(t.rows.get('B:0')).toEqual({ owner: 'H', held: false }); // its home left: a frozen body on the host
});

test('the same message list folded twice gives deep-equal tables', () => {
  // Every rule once; the release of A:0 comes before A leaves, so a fold that kept anything from an
  // earlier fold (A already gone) would give A:0 to its releaser and keep it there.
  const order: FoldMessage[] = [
    crate('H', 'H:0'),
    character('A', 'A:0'),
    character('B', 'B:0'),
    grab('A', 'H:0'),
    grab('B', 'H:0'),
    touch('B', 'H:0'),
    touch('A', 'B:0'),
    grab('B', 'A:0'),
    release('B', 'A:0'),
    release('A', 'H:0'),
    { type: 'left', id: 'A', host: 'H' },
  ];
  const first = foldAll(order);
  expect(foldAll(order)).toEqual(first);
  expect(first.rows).toEqual(
    new Map([
      ['H:0', { owner: 'H', held: false }],
      ['A:0', { owner: 'H', held: false }],
      ['B:0', { owner: 'B', held: false }],
    ]),
  );
});
