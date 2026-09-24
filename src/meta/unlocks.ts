import type { Progress } from './progress.ts';

// ADR 0013: the unlock rules, a predicate over the progress per catalogue id (src/art/cosmetics.ts owns
// which ids exist and how each looks; it encodes no rule, and the sim checks nothing). GAME.md, Meta
// Loop: every cosmetic earned by playing, within a few sessions. The highest count, 20 mines, is five
// matches of one dog round each at the 3-4 player load of 4 mines; 10 fish is four matches of three.
const RULES: Record<string, (p: Progress) => boolean> = {
  'paper-crown': (p) => p.matches >= 1, // a first match
  'fish-skeleton': (p) => p.fish >= 1, // a first fish secured
  sunflower: (p) => p.dugOut >= 1, // a dig-out
  medal: (p) => p.wins.cat >= 1 && p.wins.dog >= 1, // a round won on each side
  briefcase: (p) => p.defuses >= 3,
  'sailor-cap': (p) => p.wins.dog >= 3,
  ushanka: (p) => p.wins.cat >= 3,
  'flat-cap': (p) => p.rescues >= 5,
  scarf: (p) => p.captured >= 5,
  wreath: (p) => p.matches >= 5,
  'straw-hat': (p) => p.fish >= 10,
  loaf: (p) => p.mines >= 20,
};

export const ruled = (): string[] => Object.keys(RULES);

// The ids this progress has earned: what the lobby's picker offers.
export function unlocked(p: Progress): string[] {
  return ruled().filter((id) => RULES[id]!(p));
}

// The ids earned between two readings of the progress: the results' toast after a match.
export function newlyUnlocked(before: Progress, after: Progress): string[] {
  const had = new Set(unlocked(before));
  return unlocked(after).filter((id) => !had.has(id));
}
