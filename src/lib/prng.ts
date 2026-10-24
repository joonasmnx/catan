// Seeded PRNG: xoshiro128** seeded through splitmix32.
// Integer-only arithmetic (Math.imul, >>>), so every JS engine produces the
// same stream for the same seed. That is what makes a shared link reproduce
// the exact board on any phone.

export interface Rng {
  /** Next unsigned 32-bit integer. */
  u32(): number;
  /** Uniform integer in [0, n), n <= 2^21. */
  int(n: number): number;
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const sm = splitmix32(seed);
  let a = sm(), b = sm(), c = sm(), d = sm();
  if ((a | b | c | d) === 0) a = 1;

  const u32 = (): number => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result;
  };

  // u32 * n < 2^53 and the division is by a power of two, so this is exact.
  const int = (n: number): number => Math.floor((u32() * n) / 4294967296);

  return { u32, int };
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Fisher-Yates shuffle in place. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
