// Writes reports/REPORT.md from the property-test results (run `npm test`
// first), plus one reference run: a Markov chain that samples valid terrain
// layouts uniformly, to show how much position bias the hard rules alone cause.

import { readFileSync, writeFileSync } from 'node:fs';
import { DESERT, MODES, type Mode } from '../src/lib/components';
import { createRng } from '../src/lib/prng';
import { hexOk } from '../src/lib/rules';
import { randomValidLayout } from '../src/lib/solver';
import { chiSquare, chiSquareP } from '../tests/stats';

const N = 10_000;

function uniformValidReference(mode: Mode) {
  const spec = MODES[mode];
  const n = spec.terrainCounts.reduce((a, b) => a + b, 0);
  const at = Array.from({ length: n }, () => new Array(6).fill(0));
  for (let s = 0; s < N; s++) {
    const rng = createRng(0x5eed0000 + s);
    const l = randomValidLayout(mode, rng);
    l.token = l.token.map(() => 0); // terrain only
    // 3,000 random valid swaps: a symmetric proposal, so the chain's stationary
    // distribution is uniform over valid terrain layouts (deserts held fixed,
    // and they are placed uniformly).
    for (let k = 0; k < 3000; k++) {
      const a = rng.int(n), b = rng.int(n);
      if (a === b || l.terrain[a] === DESERT || l.terrain[b] === DESERT) continue;
      [l.terrain[a], l.terrain[b]] = [l.terrain[b], l.terrain[a]];
      if (!(hexOk(mode, l, a) && hexOk(mode, l, b))) [l.terrain[a], l.terrain[b]] = [l.terrain[b], l.terrain[a]];
    }
    l.terrain.forEach((t, h) => at[h][t]++);
  }
  let maxDev = 0, significant = 0;
  at.forEach((row) => {
    const expected = spec.terrainCounts.map((c) => (N * c) / n);
    if (chiSquareP(chiSquare(row, expected), 5) < 0.001) significant++;
    row.forEach((o, t) => (maxDev = Math.max(maxDev, Math.abs(o - expected[t]) / N)));
  });
  return { maxDev, significant, positions: n };
}

const fmt = (x: number, d = 0) => x.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const p = (x: number) => (x < 1e-4 ? x.toExponential(1) : x.toFixed(3));

const lines: string[] = ['# Generator report', '', `Seeds per mode: ${fmt(N)}. Regenerate with \`npm test && npm run report\`.`, ''];
for (const mode of ['4', '6'] as const) {
  const r = JSON.parse(readFileSync(`reports/property-${mode}.json`, 'utf8'));
  const ref = uniformValidReference(mode);
  const rm = r.metricMeans.random, om = r.metricMeans.optimised;
  lines.push(
    `## ${MODES[mode].label}`,
    '',
    '| Check | Result |',
    '| --- | --- |',
    `| Hard-rule or component-count violations | ${r.violationCount} in ${fmt(r.seeds)} boards |`,
    `| Distinct boards | ${fmt(r.unique)} of ${fmt(r.seeds)} |`,
    `| Optimised board worse than its own random start | ${r.worseThanStart} |`,
    `| Desert position uniform, chi-square | χ² = ${r.desert.chi.toFixed(1)}, df ${r.desert.df}, p = ${p(r.desert.p)} |`,
    `| Like values equally likely at every hex (wood/wool/grain, brick/ore, 6/8, 5/9 …), chi-square | χ² = ${r.exchangeability.chi.toFixed(1)}, df ${r.exchangeability.df}, p = ${p(r.exchangeability.p)}; smallest of ${r.exchangeability.tests} single tests p = ${p(r.exchangeability.minP)} |`,
    `| Terrain share per hex vs tile count, largest gap | ${(r.countTest.maxDev * 100).toFixed(1)} points (${r.countTest.significantAt001} of ${r.countTest.positions} hexes differ at p < 0.001) |`,
    `| Same test on a perfectly uniform valid sampler (reference) | ${(ref.maxDev * 100).toFixed(1)} points (${ref.significant} of ${ref.positions} hexes differ at p < 0.001) |`,
    `| Generation time (Node, one core) | ${r.msPerBoard.toFixed(1)} ms per board |`,
    '',
    '| Score (lower is fairer) | Mean | Median | 95th pct | Worst |',
    '| --- | --- | --- | --- | --- |',
    `| Random valid board | ${fmt(r.score.random.mean)} | ${fmt(r.score.random.median)} | ${fmt(r.score.random.p95)} | ${fmt(r.score.random.worst)} |`,
    `| Optimised board | ${fmt(r.score.optimised.mean)} | ${fmt(r.score.optimised.median)} | ${fmt(r.score.optimised.p95)} | ${fmt(r.score.optimised.worst)} |`,
    '',
    '| Metric, mean | Random valid | Optimised |',
    '| --- | --- | --- |',
    `| Resource production gap, pips of 36 | ${rm.productionSpread.toFixed(2)} | ${om.productionSpread.toFixed(2)} |`,
    `| First − last starting pick | ${rm.startSpread.toFixed(2)} | ${om.startSpread.toFixed(2)} |`,
    `| Touching high-number pairs | ${rm.hotPairs.toFixed(2)} | ${om.hotPairs.toFixed(2)} |`,
    `| Same resource two apart (not scored) | ${rm.sameResourceNear.toFixed(2)} | ${om.sameResourceNear.toFixed(2)} |`,
    '',
  );
}
writeFileSync('reports/REPORT.md', lines.join('\n'));
console.log(lines.join('\n'));
