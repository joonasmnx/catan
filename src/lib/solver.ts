// Randomised backtracking: a valid board by construction.
//
// Two phases, each a depth-first search over hexes in a random breadth-first
// order (so every hex is placed next to already-placed neighbours and a
// conflict is caught at once), trying values in a random order weighted by
// how many of each remain. A search that runs past NODE_LIMIT restarts with a
// fresh order from the same PRNG stream, so the result stays deterministic.

import { DESERT, MODES, isRed, type Mode } from './components';
import { geometry } from './geometry';
import { shuffle, type Rng } from './prng';
import type { Layout } from './rules';

const NODE_LIMIT = 20_000;

export function randomValidLayout(mode: Mode, rng: Rng): Layout {
  const spec = MODES[mode];
  const geo = geometry(mode);
  const n = geo.hexes.length;

  // Deserts first, uniformly at random: the desert is exempt from the rules,
  // so a search that placed it as a fallback would drift it to busy hexes.
  const deserts = shuffle(rng, range(n)).slice(0, spec.terrainCounts[DESERT]);
  const isDesert = new Set(deserts);
  const counts = [...spec.terrainCounts];
  counts[DESERT] = 0;
  const terrain = solve(
    rng,
    () => bfsOrder(rng, geo.neighbours, range(n).filter((h) => !isDesert.has(h))),
    counts,
    n,
    (h, t, placed) => geo.neighbours[h].every((nb) => placed[nb] !== t),
  );
  for (const h of deserts) terrain[h] = DESERT;

  const tokenValues = [...new Set(spec.tokens)].sort((a, b) => a - b);
  const tokenCounts = tokenValues.map((v) => spec.tokens.filter((t) => t === v).length);
  const land = range(n).filter((h) => terrain[h] !== DESERT);
  const tokenIdx = solve(
    rng,
    () => bfsOrder(rng, geo.neighbours, land),
    tokenCounts,
    n,
    (h, vi, placed) => {
      const v = tokenValues[vi];
      return geo.neighbours[h].every((nb) => {
        const o = placed[nb];
        if (o < 0) return true;
        const w = tokenValues[o];
        return w !== v && !(isRed(v) && isRed(w));
      });
    },
  );
  const token = tokenIdx.map((vi, h) => (terrain[h] === DESERT ? 0 : tokenValues[vi]));
  return { terrain, token };
}

/**
 * Assign a value index to every hex in order() so that ok() holds, using each
 * value at most counts[value] times. Unassigned slots are -1.
 */
function solve(
  rng: Rng,
  order: () => number[],
  counts: number[],
  n: number,
  ok: (h: number, value: number, placed: number[]) => boolean,
): number[] {
  for (;;) {
    const seq = order();
    const placed = new Array<number>(n).fill(-1);
    const left = [...counts];
    let nodes = 0;

    const place = (i: number): boolean => {
      if (i === seq.length) return true;
      if (++nodes > NODE_LIMIT) return false;
      const h = seq[i];
      for (const v of weightedOrder(rng, left)) {
        if (!ok(h, v, placed)) continue;
        placed[h] = v;
        left[v]--;
        if (place(i + 1)) return true;
        placed[h] = -1;
        left[v]++;
        if (nodes > NODE_LIMIT) return false;
      }
      return false;
    };

    if (place(0)) return placed;
  }
}

/** Distinct values with stock left, in a random order weighted by stock. */
function weightedOrder(rng: Rng, left: number[]): number[] {
  const pool: number[] = [];
  left.forEach((c, v) => {
    for (let k = 0; k < c; k++) pool.push(v);
  });
  shuffle(rng, pool);
  return [...new Set(pool)];
}

/** Breadth-first order over `subset` from a random start, with neighbours shuffled. */
function bfsOrder(rng: Rng, neighbours: number[][], subset: number[]): number[] {
  const inSet = new Set(subset);
  const seen = new Set<number>();
  const out: number[] = [];
  const starts = shuffle(rng, [...subset]);
  for (const s of starts) {
    if (seen.has(s)) continue;
    seen.add(s);
    const queue = [s];
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      out.push(u);
      for (const v of shuffle(rng, [...neighbours[u]])) {
        if (inSet.has(v) && !seen.has(v)) {
          seen.add(v);
          queue.push(v);
        }
      }
    }
  }
  return out;
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
