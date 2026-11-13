// Illustrated terrain, drawn from flat shapes. Each tile gets its own scatter
// from a tiny seeded generator, so no two forests look stamped, and the same
// board always draws the same picture. Coordinates are relative to the tile
// centre; the caller clips to the hexagon.

import type { Terrain } from '../lib/components';

const f = (v: number) => Math.round(v * 10) / 10;

function rand(seed: number): () => number {
  let s = (seed * 2654435761 + 97) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** n points spread over the tile (radius 46), sorted back to front. */
function scatter(r: () => number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(0.08 + 0.92 * r()) * 46;
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  return pts.sort((p, q) => p[1] - q[1]);
}

const ellipse = (x: number, y: number, rx: number, ry: number, fill: string) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"/>`;
const circle = (x: number, y: number, rad: number, fill: string) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${fill}"/>`;
const poly = (pts: number[][], fill: string) =>
  `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}"/>`;

const ART: Record<Terrain, (r: () => number) => string> = {
  forest(r) {
    const greens = ['#2f7a3a', '#3b8c40', '#276b33', '#4a9a48'];
    return scatter(r, 30)
      .map(([x, y]) => {
        const s = 6.5 + r() * 4;
        return (
          circle(x + 1.5, y + 2.5, s, '#1c4a26') +
          circle(x, y, s, greens[Math.floor(r() * greens.length)]) +
          circle(x - s * 0.3, y - s * 0.35, s * 0.42, '#63b05a')
        );
      })
      .join('');
  },
  pasture(r) {
    const patches = scatter(r, 9)
      .map(([x, y]) => ellipse(x, y, 10 + r() * 9, 5 + r() * 5, r() < 0.5 ? '#b5db6c' : '#86bd4b'))
      .join('');
    const tufts = scatter(r, 12)
      .map(([x, y]) => circle(x, y, 1.6, '#6fa63c'))
      .join('');
    const sheep = scatter(r, 6)
      .map(([x, y]) => {
        const dir = r() < 0.5 ? -1 : 1;
        return ellipse(x, y + 2.6, 4, 1.2, '#6fa63c') + ellipse(x, y, 4.2, 3, '#fbfaf2') + circle(x + dir * 4, y - 0.8, 1.7, '#3a3428');
      })
      .join('');
    return patches + tufts + sheep;
  },
  fields(r) {
    // Ploughed strips in two directions, like a patchwork seen from above.
    const tilt = r() < 0.5 ? 0.45 : -0.45;
    let out = '';
    for (let k = -9; k <= 9; k++) {
      const y = k * 7;
      const colour = k % 2 === 0 ? '#d9a62a' : '#f5d566';
      out += `<path d="M-60,${f(y - 60 * tilt)}L60,${f(y + 60 * tilt)}" stroke="${colour}" stroke-width="2.6" fill="none"/>`;
    }
    out += scatter(r, 5)
      .map(([x, y]) => ellipse(x, y + 2, 5.5, 2, '#c08f1e') + ellipse(x, y, 5, 4, '#f9e08a') + ellipse(x, y, 2.2, 1.7, '#d9a62a'))
      .join('');
    return out;
  },
  hills(r) {
    const mounds = scatter(r, 13)
      .map(([x, y]) => {
        const w = 9 + r() * 7;
        return ellipse(x, y + 2, w, w * 0.55, '#8f4420') + ellipse(x, y, w, w * 0.55, '#b9602f') + ellipse(x - w * 0.2, y - w * 0.18, w * 0.55, w * 0.25, '#d68549');
      })
      .join('');
    const bricks = scatter(r, 5)
      .map(([x, y]) => `<rect x="${f(x - 4)}" y="${f(y - 2)}" width="8" height="4" fill="#8a3b1b"/><rect x="${f(x - 2)}" y="${f(y - 5.5)}" width="8" height="3.5" fill="#a64c24"/>`)
      .join('');
    return mounds + bricks;
  },
  mountains(r) {
    return scatter(r, 11)
      .map(([x, y]) => {
        const w = 11 + r() * 6, h = 18 + r() * 10;
        const top = [x, y - h];
        return (
          poly([[x - w, y], top, [x + w, y]], '#8d929b') +
          poly([[x, y], top, [x + w, y]], '#646973') +
          poly([[x - w * 0.36, y - h * 0.64], top, [x + w * 0.36, y - h * 0.64], [x + w * 0.12, y - h * 0.52], [x - w * 0.1, y - h * 0.58]], '#f4f6f8')
        );
      })
      .join('');
  },
  desert(r) {
    const dunes = scatter(r, 9)
      .map(([x, y]) => {
        const w = 12 + r() * 12;
        return `<path d="M${f(x - w)},${f(y)}Q${f(x)},${f(y - 7 - r() * 4)} ${f(x + w)},${f(y)}" stroke="#c4a35f" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      })
      .join('');
    const stones = scatter(r, 8)
      .map(([x, y]) => circle(x, y, 1.3, '#b8975a'))
      .join('');
    return dunes + stones;
  },
};

export function tileArt(terrain: Terrain, seed: number): string {
  return ART[terrain](rand(seed));
}
