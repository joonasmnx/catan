// Public entry point: (mode, seed) → the same balanced board, every time.

import type { Mode } from './components';
import { optimise } from './optimise';
import { createRng } from './prng';
import { metrics, type Metrics } from './score';
import { randomValidLayout } from './solver';
import { violations, type Layout } from './rules';

export interface Board {
  mode: Mode;
  seed: number;
  layout: Layout;
  metrics: Metrics;
  /** The valid random board the optimiser started from, for comparison. */
  start: { layout: Layout; metrics: Metrics };
}

export function generate(mode: Mode, seed: number): Board {
  const rng = createRng(seed);
  const startLayout = randomValidLayout(mode, rng);
  const start = { layout: startLayout, metrics: metrics(mode, startLayout) };
  const { layout, metrics: m } = optimise(mode, startLayout, rng);
  const broken = violations(mode, layout);
  if (broken.length) throw new Error(`Board ${mode}/${seed} broke a hard rule: ${broken[0].kind}`);
  return { mode, seed, layout, metrics: m, start };
}

// Board codes: mode digit + seed in Crockford base32 (7 chars), e.g. "4-7K2QM9X".
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function encodeCode(mode: Mode, seed: number): string {
  let s = seed >>> 0;
  let out = '';
  for (let i = 0; i < 7; i++) {
    out = ALPHABET[s % 32] + out;
    s = Math.floor(s / 32);
  }
  return `${mode}-${out}`;
}

export function decodeCode(code: string): { mode: Mode; seed: number } | null {
  const m = /^([46])-?([0-9A-Za-z]{7})$/.exec(code.trim());
  if (!m) return null;
  let seed = 0;
  for (const ch of m[2].toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0')) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    seed = seed * 32 + v;
  }
  if (seed > 0xffffffff) return null;
  return { mode: m[1] as Mode, seed };
}
