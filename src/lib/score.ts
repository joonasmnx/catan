// Balance metrics. Everything is counted in pips: pips(n) = 6 − |7 − n| is the
// number of the 36 dice outcomes that roll n, so P(n) = pips / 36 and a sum of
// pips is "payouts per 36 rolls". All metrics are integers, so the score and
// every comparison the optimiser makes are exact on every JS engine.

import { DESERT, MODES, RESOURCES, pips, type Mode } from './components';
import { geometry } from './geometry';
import type { Layout } from './rules';

/** One pip of value per distinct resource at a spot: see weights below. */
export const DIVERSITY_BONUS = 1;

export interface Metrics {
  /** Pips per resource, in RESOURCES order. Sum of P over its hexes, times 36. */
  production: number[];
  /** max − min of production. */
  productionSpread: number;
  /** Greedy setup draft: vertex ids in pick order (2 × players picks). */
  draft: number[];
  /** Value of each draft pick. */
  draftValues: number[];
  /** First pick − last pick. */
  startSpread: number;
  /** Same-resource hex pairs two steps apart (one step is a hard-rule break). Reported, not scored. */
  sameResourceNear: number;
  /** Touching pairs where both tokens are 5, 6, 8 or 9 (4+ pips). */
  hotPairs: number;
  /** Single integer score, lower is fairer. */
  score: number;
}

/**
 * Weights, per unit of each metric.
 *
 * Each metric is first divided by its spread (standard deviation) over plain
 * random valid boards, so one unit of "unusual" counts the same in every
 * metric; then it gets an importance share:
 *   start-spot fairness 40%  (what decides who wins the setup)
 *   resource production 35%  (no resource starved or flooded)
 *   high-number spread  25%  (5, 6, 8, 9 not bunched together)
 * WEIGHTS[k] = round(1000 × share / σ_k). σ was measured with
 * scripts/report.ts over 2,000 random valid boards per mode; a unit test
 * re-measures it and fails if it drifts by more than 25%.
 *
 * Same-resource tiles two steps apart are measured but not scored. Any weight
 * on them (tested down to about 2%) pushes the 3-tile resources (brick, ore)
 * into the inner ring, up to 39% of boards against 32% expected, because
 * 4-tile resources spread out most easily along the coast. The hard rule
 * already keeps same resources from touching; position randomness won.
 */
export const SIGMA: Record<Mode, { start: number; production: number; hot: number }> = {
  '4': { start: 0.99, production: 2.54, hot: 1.37 },
  '6': { start: 0.83, production: 3.29, hot: 1.67 },
};
export const SHARE = { start: 0.4, production: 0.35, hot: 0.25 };

export function weights(mode: Mode) {
  const s = SIGMA[mode];
  return {
    start: Math.round((1000 * SHARE.start) / s.start),
    production: Math.round((1000 * SHARE.production) / s.production),
    hot: Math.round((1000 * SHARE.hot) / s.hot),
  };
}

/** Value of a settlement spot: its pips plus a bonus per distinct resource. */
export function spotValues(mode: Mode, layout: Layout): number[] {
  const geo = geometry(mode);
  return geo.vertexHexes.map((hs) => {
    let v = 0;
    let seen = 0;
    for (const h of hs) {
      v += pips(layout.token[h]);
      const t = layout.terrain[h];
      if (t !== DESERT && !(seen & (1 << t))) {
        seen |= 1 << t;
        v += DIVERSITY_BONUS;
      }
    }
    return v;
  });
}

/**
 * Greedy setup draft: each pick takes the best spot still legal under the
 * distance rule (no settlement next to another). Ties go to the lower vertex
 * id, so the draft is deterministic.
 */
export function draft(mode: Mode, values: number[], picks: number): number[] {
  const geo = geometry(mode);
  const order = values.map((_, i) => i).sort((a, b) => values[b] - values[a] || a - b);
  const blocked = new Uint8Array(values.length);
  const out: number[] = [];
  for (const v of order) {
    if (out.length === picks) break;
    if (blocked[v]) continue;
    out.push(v);
    blocked[v] = 1;
    for (const nb of geo.vertexNeighbours[v]) blocked[nb] = 1;
  }
  return out;
}

export function metrics(mode: Mode, layout: Layout): Metrics {
  const geo = geometry(mode);
  const n = geo.hexes.length;
  const { terrain, token } = layout;

  const production = RESOURCES.map(() => 0);
  terrain.forEach((t, h) => {
    if (t !== DESERT) production[t] += pips(token[h]);
  });
  const productionSpread = Math.max(...production) - Math.min(...production);

  const values = spotValues(mode, layout);
  const picks = draft(mode, values, 2 * MODES[mode].players);
  const draftValues = picks.map((v) => values[v]);
  const startSpread = draftValues[0] - draftValues[draftValues.length - 1];

  let sameResourceNear = 0;
  for (let a = 0; a < n; a++) {
    if (terrain[a] === DESERT) continue;
    for (let b = a + 1; b < n; b++) {
      if (terrain[b] === terrain[a] && geo.dist[a * n + b] === 2) sameResourceNear++;
    }
  }
  let hotPairs = 0;
  for (const [a, b] of geo.hexEdges) {
    if (pips(token[a]) >= 4 && pips(token[b]) >= 4) hotPairs++;
  }

  const w = weights(mode);
  const score = w.start * startSpread + w.production * productionSpread + w.hot * hotPairs;

  return { production, productionSpread, draft: picks, draftValues, startSpread, sameResourceNear, hotPairs, score };
}

/**
 * The same score as metrics().score, without allocations: the optimiser calls
 * this thousands of times per board. A unit test checks the two always agree.
 */
export function fastScore(mode: Mode, layout: Layout): number {
  const ctx = fastContext(mode);
  const { terrain, token } = layout;
  const { vh, vhStart, vn, vnStart, edgesA, edgesB, nv, picks, w, prod, val, blocked, bucketHead, bucketNext } = ctx;

  prod.fill(0);
  for (let h = 0; h < terrain.length; h++) if (terrain[h] !== DESERT) prod[terrain[h]] += PIPS[token[h]];
  let pmax = prod[0], pmin = prod[0];
  for (let r = 1; r < prod.length; r++) {
    if (prod[r] > pmax) pmax = prod[r];
    if (prod[r] < pmin) pmin = prod[r];
  }

  // Spot values, bucketed by value so the draft needs no sort.
  bucketHead.fill(-1);
  for (let v = nv - 1; v >= 0; v--) {
    let s = 0, seen = 0;
    for (let k = vhStart[v]; k < vhStart[v + 1]; k++) {
      const h = vh[k];
      s += PIPS[token[h]];
      const t = terrain[h];
      if (t !== DESERT && !(seen & (1 << t))) {
        seen |= 1 << t;
        s += DIVERSITY_BONUS;
      }
    }
    val[v] = s;
    // Insert at the head while walking ids downwards keeps each bucket in ascending id order.
    bucketNext[v] = bucketHead[s];
    bucketHead[s] = v;
  }
  blocked.fill(0);
  let taken = 0, first = -1, last = -1;
  for (let s = bucketHead.length - 1; s >= 0 && taken < picks; s--) {
    for (let v = bucketHead[s]; v >= 0 && taken < picks; v = bucketNext[v]) {
      if (blocked[v]) continue;
      if (taken === 0) first = s;
      last = s;
      taken++;
      blocked[v] = 1;
      for (let k = vnStart[v]; k < vnStart[v + 1]; k++) blocked[vn[k]] = 1;
    }
  }

  let hot = 0;
  for (let e = 0; e < edgesA.length; e++) if (PIPS[token[edgesA[e]]] >= 4 && PIPS[token[edgesB[e]]] >= 4) hot++;

  return w.start * (first - last) + w.production * (pmax - pmin) + w.hot * hot;
}

const PIPS = Int8Array.from({ length: 13 }, (_, n) => pips(n));

type FastContext = ReturnType<typeof buildFast>;
const fastCache = new Map<Mode, FastContext>();
function fastContext(mode: Mode): FastContext {
  let c = fastCache.get(mode);
  if (!c) fastCache.set(mode, (c = buildFast(mode)));
  return c;
}
function buildFast(mode: Mode) {
  const geo = geometry(mode);
  const flat = (lists: number[][]) => {
    const start = new Int32Array(lists.length + 1);
    lists.forEach((l, i) => (start[i + 1] = start[i] + l.length));
    return [Int32Array.from(lists.flat()), start] as const;
  };
  const [vh, vhStart] = flat(geo.vertexHexes);
  const [vn, vnStart] = flat(geo.vertexNeighbours);
  const nv = geo.vertexXY.length;
  return {
    vh, vhStart, vn, vnStart, nv,
    edgesA: Int32Array.from(geo.hexEdges.map((e) => e[0])),
    edgesB: Int32Array.from(geo.hexEdges.map((e) => e[1])),
    picks: 2 * MODES[mode].players,
    w: weights(mode),
    prod: new Int32Array(RESOURCES.length),
    val: new Int32Array(nv),
    blocked: new Uint8Array(nv),
    bucketHead: new Int32Array(3 * 5 + 3 * DIVERSITY_BONUS + 1),
    bucketNext: new Int32Array(nv),
  };
}
