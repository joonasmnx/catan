import { describe, expect, it } from 'vitest';
import { generate } from '../../src/lib/board';
import { run, SEEDS } from './run';

const MODE = '4' as const;

describe(`property: mode ${MODE}, ${SEEDS} seeds`, () => {
  const r = run(MODE);

  it('never breaks a hard rule and always has the official component counts', () => {
    expect(r.violationCount).toBe(0);
  });

  it('never repeats a board', () => {
    expect(r.unique).toBe(SEEDS);
  });

  it('places the desert uniformly (chi-square, p > 0.001)', () => {
    expect(r.desert.p).toBeGreaterThan(0.001);
  });

  it('has no hidden preference between resources or numbers the rules treat alike (chi-square)', () => {
    expect(r.exchangeability.p).toBeGreaterThan(0.001);
    // Bonferroni over every position and group.
    expect(r.exchangeability.minP).toBeGreaterThan(0.01 / r.exchangeability.tests);
  });

  it('lands each terrain on each hex within 5 percentage points of its tile share', () => {
    expect(r.countTest.maxDev).toBeLessThan(0.05);
  });

  it('optimised boards beat plain random valid boards', () => {
    expect(r.worseThanStart).toBe(0);
    expect(r.score.optimised.mean).toBeLessThan(0.4 * r.score.random.mean);
    expect(r.score.optimised.worst).toBeLessThan(r.score.random.median);
  });

  it('is deterministic: regenerating a sample gives identical boards', () => {
    for (let seed = 1; seed <= SEEDS; seed += 37) {
      expect(generate(MODE, seed)).toEqual(generate(MODE, seed));
    }
  });
});
