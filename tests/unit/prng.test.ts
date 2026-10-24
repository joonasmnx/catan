import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from '../../src/lib/prng';

describe('prng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42), b = createRng(42), c = createRng(43);
    const sa = Array.from({ length: 50 }, () => a.u32());
    const sb = Array.from({ length: 50 }, () => b.u32());
    const sc = Array.from({ length: 50 }, () => c.u32());
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
  });

  it('keeps a fixed stream (shared links depend on it)', () => {
    const r = createRng(1);
    expect(Array.from({ length: 4 }, () => r.u32())).toMatchSnapshot();
  });

  it('int(n) stays in range and covers it evenly', () => {
    const r = createRng(7);
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[r.int(6)]++;
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(400);
  });

  it('shuffle is a permutation', () => {
    const arr = shuffle(createRng(3), Array.from({ length: 30 }, (_, i) => i));
    expect([...arr].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });
});
