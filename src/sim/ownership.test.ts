import { expect, test } from 'vitest';
import type { ClientId, NetId } from './entities.ts';
import type { Spawn } from './messages.ts';
import { fold, newOwnershipTable, type FoldMessage } from './ownership.ts';

const at = { x: 0, y: 1, z: 0 };
const crate = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'prop', home: null, p: at });
const character = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'cat', home: from, p: at });
const dog = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'dog', home: from, p: at });
const fish = (from: ClientId, id: NetId): Spawn => ({ type: 'spawn', from, id, kind: 'fish', home: null, p: at });
const grab = (from: ClientId, id: NetId): FoldMessage => ({ type: 'claim', from, id, hold: true });
const touch = (from: ClientId, id: NetId): FoldMessage => ({ type: 'claim', from, id, hold: false });
const release = (from: ClientId, id: NetId): FoldMessage => ({ type: 'release', from, id, p: at, q: { x: 0, y: 0, z: 0, w: 1 }, v: at });

// Folds a relay order into a fresh table; kinds and homes come from the spawns, as the entity table's do.
function foldAll(order: FoldMessage[]) {
  const identities = new Map(order.flatMap((m) => (m.type === 'spawn' ? [[m.id, m] as const] : [])));
  const t = newOwnershipTable();
  for (const m of order) fold(t, m, identities);
  return t;
}

test('two simultaneous grabs: the first delivered wins', () => {
  const t = foldAll([crate('H', 'H:0'), character('A', 'A:0'), character('B', 'B:0'), grab('A', 'H:0'), grab('B', 'H:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: true });
});

test('a touch claim on a held prop is rejected', () => {
  const t = foldAll([crate('H', 'H:0'), character('A', 'A:0'), grab('A', 'H:0'), touch('B', 'H:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: true });
});

test('a touch claim on a character is rejected', () => {
  const t = foldAll([character('A', 'A:0'), touch('B', 'A:0')]);
  expect(t.rows.get('A:0')).toEqual({ owner: 'A', held: false });
});

test('only a grab takes a character, and its release returns it home', () => {
  const order = [character('A', 'A:0'), dog('B', 'B:0'), grab('B', 'A:0')];
  expect(foldAll(order).rows.get('A:0')).toEqual({ owner: 'B', held: true });
  expect(foldAll([...order, release('B', 'A:0')]).rows.get('A:0')).toEqual({ owner: 'A', held: false });
});

test("left: the leavers' props go to the host; a character a leaver carried goes back to its home", () => {
  // A dog B carries the cat A, a cat C carries a crate; sides let no one client hold both.
  const t = foldAll([
    crate('H', 'H:0'),
    crate('H', 'H:1'),
    character('A', 'A:0'),
    dog('B', 'B:0'),
    character('C', 'C:0'),
    touch('B', 'H:0'),
    grab('C', 'H:1'),
    grab('B', 'A:0'),
    { type: 'left', id: 'B', host: 'H' },
    { type: 'left', id: 'C', host: 'H' },
  ]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'H', held: false });
  expect(t.rows.get('H:1')).toEqual({ owner: 'H', held: false });
  expect(t.rows.get('A:0')).toEqual({ owner: 'A', held: false });
  expect(t.rows.get('B:0')).toEqual({ owner: 'H', held: false }); // its home left: a frozen body on the host
});

test('a hold claim the side rule refuses is rejected: a dog on a fish, a cat on a dog', () => {
  const t = foldAll([fish('H', 'H:0'), character('A', 'A:0'), dog('B', 'B:0'), grab('B', 'H:0'), grab('A', 'B:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'H', held: false });
  expect(t.rows.get('B:0')).toEqual({ owner: 'B', held: false });
});

test("a grabbed cat drops what it holds: the fish stays with the cat's client, unheld", () => {
  const t = foldAll([fish('H', 'H:0'), character('A', 'A:0'), dog('B', 'B:0'), grab('A', 'H:0'), grab('B', 'A:0')]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: false });
  expect(t.rows.get('A:0')).toEqual({ owner: 'B', held: true });
});

test('the same message list folded twice gives deep-equal tables', () => {
  // Every rule once; the release of A:0 comes before A leaves, so a fold that kept anything from an
  // earlier fold (A already gone) would give A:0 to its releaser and keep it there.
  const order: FoldMessage[] = [
    crate('H', 'H:0'),
    character('A', 'A:0'),
    dog('B', 'B:0'),
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

test("a cat's hold claim on a prop heavier than a cat carries is refused: 20 kg no, 5 kg yes; a touch on it still takes it", () => {
  const level = { props: [20, 5].map((mass) => ({ label: 'box', p: at, shape: { box: at }, mass, synced: true })) };
  const order: FoldMessage[] = [{ ...crate('H', 'H:0'), prop: 0 }, { ...crate('H', 'H:1'), prop: 1 }, character('A', 'A:0'), grab('A', 'H:0'), grab('A', 'H:1'), touch('A', 'H:0')];
  const identities = new Map(order.flatMap((m) => (m.type === 'spawn' ? [[m.id, m] as const] : [])));
  const t = newOwnershipTable();
  const accepted = order.map((m) => fold(t, m, identities, undefined, level));
  expect(accepted.slice(3)).toEqual([false, true, true]);
  expect(t.rows.get('H:0')).toEqual({ owner: 'A', held: false });
});
