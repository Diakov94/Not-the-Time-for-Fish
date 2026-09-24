import { afterEach, expect, test, vi } from 'vitest';

// A browser's storage that outlives the page; `load` is a page load: a fresh module, an empty cache.
const kept = new Map<string, string>();
const storage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) };
const load = async () => {
  vi.resetModules();
  return import('./store.ts');
};
afterEach(() => {
  kept.clear();
  vi.unstubAllGlobals();
});

test('a saved setting survives a reload', async () => {
  vi.stubGlobal('localStorage', storage);
  (await load()).save({ textScale: 1.4, sneak: 'hold' });
  const { settings } = await load();
  console.log(`text scale saved 1.4 -> after a reload ${settings().textScale}`);
  expect(settings()).toMatchObject({ textScale: 1.4, sneak: 'hold', volume: 1 });
});

test('storage that throws, a corrupt value and another version give the defaults', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  });
  const blocked = await load();
  blocked.save({ textScale: 1.4 });
  console.log(`storage throwing: text scale ${blocked.settings().textScale}`);
  expect(blocked.settings()).toEqual(blocked.DEFAULTS);

  vi.stubGlobal('localStorage', storage);
  (await load()).save({ textScale: 1.4 });
  const [key, value] = [...kept][0]!;
  kept.set(key, value.slice(1));
  expect((await load()).settings().textScale).toBe(1);
  kept.set(key, JSON.stringify({ ...JSON.parse(value), version: 0 }));
  expect((await load()).settings().textScale).toBe(1);
});
