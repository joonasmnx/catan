// Small statistics helpers for the property tests and the report script.

/** Upper tail P(X >= x) for a chi-square distribution with k degrees of freedom. */
export function chiSquareP(x: number, k: number): number {
  return 1 - lowerGammaRegularised(k / 2, x / 2);
}

/** Pearson chi-square statistic for observed counts against expected counts. */
export function chiSquare(observed: number[], expected: number[]): number {
  return observed.reduce((acc, o, i) => acc + (o - expected[i]) ** 2 / expected[i], 0);
}

function lowerGammaRegularised(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    // Series expansion.
    let sum = 1 / s;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x / (s + n);
      sum += term;
      if (term < sum * 1e-15) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }
  // Continued fraction for the upper tail (Lentz).
  let b = x + 1 - s;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

function logGamma(z: number): number {
  // Lanczos approximation, g = 7.
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return { mean, median: q(0.5), p95: q(0.95), worst: sorted[sorted.length - 1], best: sorted[0] };
}
