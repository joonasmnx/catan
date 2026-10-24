// Local search: start from a valid random board and improve its score.
//
// Moves are permutations, so component counts can never change:
//   swap the tokens of two producing hexes,
//   swap the terrain of two producing hexes (tokens stay put),
//   swap two whole producing tiles (terrain and token together).
// Deserts never move: their place is drawn uniformly at random by the solver,
// so the optimiser cannot herd them to one spot (it would pick the centre).
// A move is kept only if every hard rule around the touched hexes still holds
// and the score passes the acceptance test. Acceptance is threshold accepting
// (Dueck & Scheuer, 1990): a simulated-annealing variant that accepts any move
// that is worse by less than a threshold falling linearly to zero. It needs no
// Math.exp, so with integer scores the run is bit-identical on every engine.

import { DESERT, type Mode } from './components';
import { fastScore, metrics, type Metrics } from './score';
import { hexOk, type Layout } from './rules';
import type { Rng } from './prng';

export const BUDGET: Record<Mode, number> = { '4': 12000, '6': 16000 };
/** Starting threshold, in score units (below one hot pair or one pip of start spread). */
const THRESHOLD0 = 60;

export function optimise(mode: Mode, start: Layout, rng: Rng, budget = BUDGET[mode]): { layout: Layout; metrics: Metrics } {
  const cur: Layout = { terrain: [...start.terrain], token: [...start.token] };
  const n = cur.terrain.length;
  let curScore = fastScore(mode, cur);
  let best = { terrain: [...cur.terrain], token: [...cur.token] };
  let bestScore = curScore;

  for (let it = 0; it < budget; it++) {
    const threshold = Math.floor((THRESHOLD0 * (budget - it)) / budget);
    const a = rng.int(n);
    let b = rng.int(n - 1);
    if (b >= a) b++;
    const move = rng.int(5); // 0-1 tokens, 2-3 terrain, 4 whole tile
    if (cur.terrain[a] === DESERT || cur.terrain[b] === DESERT) continue;

    const swapTok = move < 2 || move === 4;
    const swapTer = move >= 2;
    if (swapTok) swap(cur.token, a, b);
    if (swapTer) swap(cur.terrain, a, b);

    let accept = hexOk(mode, cur, a) && hexOk(mode, cur, b);
    let next = curScore;
    if (accept) {
      next = fastScore(mode, cur);
      accept = next - curScore <= threshold;
    }
    if (accept) {
      curScore = next;
      if (curScore < bestScore) {
        bestScore = curScore;
        best = { terrain: [...cur.terrain], token: [...cur.token] };
      }
    } else {
      if (swapTok) swap(cur.token, a, b);
      if (swapTer) swap(cur.terrain, a, b);
    }
  }
  return { layout: best, metrics: metrics(mode, best) };
}

function swap(arr: number[], a: number, b: number): void {
  const t = arr[a];
  arr[a] = arr[b];
  arr[b] = t;
}
