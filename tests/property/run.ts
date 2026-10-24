// Shared property run: 10,000 seeds of one mode, with everything the
// assertions and the report need. Writes reports/property-<mode>.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { generate } from '../../src/lib/board';
import { DESERT, MODES, type Mode } from '../../src/lib/components';
import { violations } from '../../src/lib/rules';
import { chiSquare, chiSquareP, summary } from '../stats';

export const SEEDS = 10_000;

/** Pairs of values that the rules and the score treat identically. */
const TERRAIN_CLASSES = [[0, 1, 2], [3, 4]]; // 4-tile resources, 3-tile resources
const TOKEN_PAIRS = [[2, 12], [3, 11], [4, 10], [5, 9], [6, 8]];

export function run(mode: Mode) {
  const spec = MODES[mode];
  const n = spec.terrainCounts.reduce((a, b) => a + b, 0);
  const terrainAt = Array.from({ length: n }, () => new Array(6).fill(0));
  const tokenAt = Array.from({ length: n }, () => new Array(13).fill(0));
  const seen = new Set<string>();
  let violationCount = 0, badBoards = 0, worseThanStart = 0;
  const finalScores: number[] = [], startScores: number[] = [];
  const keys = ['startSpread', 'productionSpread', 'hotPairs', 'sameResourceNear'] as const;
  const sums = { start: Object.fromEntries(keys.map((k) => [k, 0])), final: Object.fromEntries(keys.map((k) => [k, 0])) };
  const t0 = performance.now();

  for (let seed = 1; seed <= SEEDS; seed++) {
    const b = generate(mode, seed);
    const v = violations(mode, b.layout).length + violations(mode, b.start.layout).length;
    violationCount += v;
    if (v) badBoards++;
    b.layout.terrain.forEach((t, h) => {
      terrainAt[h][t]++;
      tokenAt[h][b.layout.token[h]]++;
    });
    seen.add(b.layout.terrain.join('') + '|' + b.layout.token.join(','));
    finalScores.push(b.metrics.score);
    startScores.push(b.start.metrics.score);
    if (b.metrics.score > b.start.metrics.score) worseThanStart++;
    for (const k of keys) {
      sums.final[k] += b.metrics[k];
      sums.start[k] += b.start.metrics[k];
    }
  }
  const ms = (performance.now() - t0) / SEEDS;

  // Desert: placed uniformly, so every position should see it equally often.
  const desertObs = terrainAt.map((row) => row[DESERT]);
  const desertChi = chiSquare(desertObs, desertObs.map(() => (SEEDS * spec.terrainCounts[DESERT]) / n));
  const desertP = chiSquareP(desertChi, n - 1);

  // Exchangeability: at every position, values the rules treat alike appear equally often.
  let exChi = 0, exDf = 0, exMinP = 1;
  const groups = [
    ...TERRAIN_CLASSES.map((cls) => terrainAt.map((row) => cls.map((t) => row[t]))),
    ...TOKEN_PAIRS.map((pair) => tokenAt.map((row) => pair.map((t) => row[t]))),
  ];
  for (const perPosition of groups) {
    for (const obs of perPosition) {
      const total = obs.reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      const chi = chiSquare(obs, obs.map(() => total / obs.length));
      exChi += chi;
      exDf += obs.length - 1;
      exMinP = Math.min(exMinP, chiSquareP(chi, obs.length - 1));
    }
  }
  const exP = chiSquareP(exChi, exDf);

  // Against tile counts (the user's literal test): reported with effect size.
  let maxDev = 0, maxDevAt = '';
  let countMinP = 1, countSignificant = 0;
  terrainAt.forEach((row, h) => {
    const expected = spec.terrainCounts.map((c) => (SEEDS * c) / n);
    const p = chiSquareP(chiSquare(row, expected), 5);
    countMinP = Math.min(countMinP, p);
    if (p < 0.001) countSignificant++;
    row.forEach((o, t) => {
      const dev = Math.abs(o - expected[t]) / SEEDS;
      if (dev > maxDev) [maxDev, maxDevAt] = [dev, `hex ${h}, terrain ${t}`];
    });
  });

  const mean = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / SEEDS]));
  const result = {
    mode,
    seeds: SEEDS,
    msPerBoard: ms,
    violationCount,
    badBoards,
    unique: seen.size,
    worseThanStart,
    desert: { chi: desertChi, df: n - 1, p: desertP },
    exchangeability: { chi: exChi, df: exDf, p: exP, minP: exMinP, tests: groups.reduce((a, g) => a + g.length, 0) },
    countTest: { positions: n, minP: countMinP, significantAt001: countSignificant, maxDev, maxDevAt },
    score: { random: summary(startScores), optimised: summary(finalScores) },
    metricMeans: { random: mean(sums.start), optimised: mean(sums.final) },
  };
  mkdirSync('reports', { recursive: true });
  writeFileSync(`reports/property-${mode}.json`, JSON.stringify(result, null, 2));
  return result;
}
