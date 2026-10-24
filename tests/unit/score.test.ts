import { describe, expect, it } from 'vitest';
import { pips } from '../../src/lib/components';
import { createRng } from '../../src/lib/prng';
import { draft, fastScore, metrics, SIGMA, spotValues } from '../../src/lib/score';
import { randomValidLayout } from '../../src/lib/solver';
import { geometry } from '../../src/lib/geometry';
import { generate } from '../../src/lib/board';

describe('dice maths', () => {
  it('pips(n) = 6 − |7 − n| and sum to 36 over 2..12', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(pips)).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((a, n) => a + pips(n), 0)).toBe(36);
  });
});

describe.each(['4', '6'] as const)('score %s', (mode) => {
  it('fastScore equals metrics().score on random and optimised boards', () => {
    for (let s = 0; s < 1500; s++) {
      const l = randomValidLayout(mode, createRng(s));
      expect(fastScore(mode, l)).toBe(metrics(mode, l).score);
    }
    for (let s = 0; s < 30; s++) {
      const b = generate(mode, s);
      expect(fastScore(mode, b.layout)).toBe(b.metrics.score);
    }
  });

  it('production per resource adds up to all pips on the board', () => {
    const b = generate(mode, 5);
    const total = b.layout.token.reduce((a, t) => a + pips(t), 0);
    expect(b.metrics.production.reduce((a, p) => a + p, 0)).toBe(total);
  });

  it('the draft takes the best legal spot each time and obeys the distance rule', () => {
    const geo = geometry(mode);
    const b = generate(mode, 9);
    const values = spotValues(mode, b.layout);
    const picks = draft(mode, values, 2 * (mode === '4' ? 4 : 6));
    for (let i = 0; i < picks.length; i++) {
      for (let j = 0; j < i; j++) expect(geo.vertexNeighbours[picks[j]]).not.toContain(picks[i]);
      expect(values[picks[i]]).toBeLessThanOrEqual(values[picks[Math.max(0, i - 1)]]);
    }
  });

  it('the normalising σ values still match random valid boards (within 25%)', () => {
    const keys = ['startSpread', 'productionSpread', 'hotPairs'] as const;
    const map = { startSpread: 'start', productionSpread: 'production', hotPairs: 'hot' } as const;
    const samples = keys.map(() => [] as number[]);
    for (let s = 0; s < 2000; s++) {
      const m = metrics(mode, randomValidLayout(mode, createRng(1_000_000 + s)));
      keys.forEach((k, i) => samples[i].push(m[k]));
    }
    keys.forEach((k, i) => {
      const xs = samples[i];
      const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length);
      expect(Math.abs(sd / SIGMA[mode][map[k]] - 1)).toBeLessThan(0.25);
    });
  });
});
