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

const path = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>`;

/** Soft blotches of a second tone, so the ground is never one flat colour. */
function ground(r: () => number, n: number, tones: string[]): string {
  return scatter(r, n)
    .map(([x, y]) => ellipse(x, y, 12 + r() * 14, 7 + r() * 9, tones[Math.floor(r() * tones.length)]))
    .join('');
}

const ART: Record<Terrain, (r: () => number) => string> = {
  forest(r) {
    const greens = ['#2f7a3a', '#3b8c40', '#276b33', '#4a9a48', '#357f3c'];
    const trees = scatter(r, 34)
      .map(([x, y]) => {
        const s = 6.5 + r() * 4;
        if (r() < 0.3) {
          // A fir: three stacked tiers with a lit left side.
          const h = s * 2.6;
          let fir = ellipse(x + 2, y + 2, s * 0.9, s * 0.35, '#163d20');
          for (let k = 0; k < 3; k++) {
            const w = s * (1 - k * 0.24), top = y - h * (0.42 + k * 0.29), base = y - h * (k * 0.26);
            fir += poly([[x - w, base], [x, top], [x + w, base]], '#1f5a2c') + poly([[x - w, base], [x, top], [x, base]], '#2f7a3a');
          }
          return fir;
        }
        return (
          ellipse(x + 2.5, y + 3.5, s, s * 0.8, '#163d20') +
          circle(x, y, s, greens[Math.floor(r() * greens.length)]) +
          circle(x + s * 0.25, y + s * 0.3, s * 0.62, '#22602e') +
          circle(x - s * 0.28, y - s * 0.32, s * 0.5, '#5fae57') +
          circle(x - s * 0.42, y - s * 0.46, s * 0.2, '#8fd07c')
        );
      })
      .join('');
    return ground(r, 8, ['#235a2d', '#2f6f38']) + trees;
  },
  pasture(r) {
    const [px0, py0] = [(r() - 0.5) * 50, 24 + r() * 12];
    const pond = ellipse(px0, py0, 11, 5.5, '#4e9fd6') + ellipse(px0 - 2, py0 - 1.2, 6, 2, '#8fc8ee');
    const flowers = scatter(r, 22)
      .map(([x, y]) => circle(x, y, 0.9, r() < 0.5 ? '#fff6b0' : '#ffffff'))
      .join('');
    const tufts = scatter(r, 16)
      .map(([x, y]) => path(`M${f(x - 2)},${f(y)}l1,-3l1,3l1,-3.4l1,3.4`, 'stroke="#5f9a35" stroke-width="0.9" fill="none"'))
      .join('');
    const sheep = scatter(r, 7)
      .map(([x, y]) => {
        const dir = r() < 0.5 ? -1 : 1;
        return (
          ellipse(x + 0.8, y + 3, 4.4, 1.3, '#5f9a35') +
          `<rect x="${f(x - 2.4)}" y="${f(y + 1)}" width="1" height="2.6" fill="#3a3428"/><rect x="${f(x + 1.4)}" y="${f(y + 1)}" width="1" height="2.6" fill="#3a3428"/>` +
          ellipse(x, y, 4.4, 3.1, '#fbfaf2') +
          ellipse(x - 0.8, y - 1, 2.6, 1.5, '#ffffff') +
          circle(x + dir * 4.2, y - 0.9, 1.8, '#3a3428')
        );
      })
      .join('');
    return ground(r, 10, ['#b5db6c', '#86bd4b', '#a9d463']) + pond + tufts + flowers + sheep;
  },
  fields(r) {
    // Three ploughed plots, each with its own furrow direction.
    let out = '';
    const plots = [
      { clip: 'M-60,-60H60V-12H-60Z', tilt: 0.5, a: '#d9a62a', b: '#f5d566' },
      { clip: 'M-60,-12H4V60H-60Z', tilt: -0.35, a: '#cf9a22', b: '#efc94f' },
      { clip: 'M4,-12H60V60H4Z', tilt: 0.9, a: '#e0b23a', b: '#f8dd78' },
    ];
    const id = Math.floor(r() * 1e9);
    plots.forEach((plot, k) => {
      let rows = '';
      for (let j = -14; j <= 14; j++) {
        const y = j * 6;
        rows += path(`M-70,${f(y - 70 * plot.tilt)}L70,${f(y + 70 * plot.tilt)}`, `stroke="${j % 2 === 0 ? plot.a : plot.b}" stroke-width="3.1" fill="none"`);
      }
      out += `<clipPath id="plot${id}-${k}"><path d="${plot.clip}"/></clipPath><g clip-path="url(#plot${id}-${k})">${rows}</g>`;
    });
    out += path('M-60,-12H60M4,-12V60', 'stroke="#b8891d" stroke-width="1.6" fill="none"');
    out += scatter(r, 6)
      .map(([x, y]) => ellipse(x + 1, y + 3, 5.5, 1.8, '#b8891d') + ellipse(x, y, 5, 4, '#f9e08a') + ellipse(x, y, 3, 2.3, '#e7bf4d') + ellipse(x, y, 1.1, 0.9, '#c9992a'))
      .join('');
    return out;
  },
  hills(r) {
    const mounds = scatter(r, 14)
      .map(([x, y]) => {
        const w = 9 + r() * 8;
        return (
          ellipse(x + 1.5, y + 3, w, w * 0.5, '#7d3a1a') +
          ellipse(x, y, w, w * 0.56, '#b9602f') +
          ellipse(x + w * 0.2, y + w * 0.12, w * 0.7, w * 0.32, '#a3512a') +
          ellipse(x - w * 0.22, y - w * 0.2, w * 0.55, w * 0.22, '#d98a4f') +
          path(`M${f(x - w * 0.7)},${f(y + w * 0.1)}Q${f(x)},${f(y + w * 0.42)} ${f(x + w * 0.7)},${f(y + w * 0.1)}`, 'stroke="#8f4420" stroke-width="0.9" fill="none"')
        );
      })
      .join('');
    const bricks = scatter(r, 5)
      .map(([x, y]) => {
        let stack = ellipse(x + 2, y + 3, 9, 2, '#6f3116');
        for (let row = 0; row < 3; row++) {
          for (let c = 0; c < 3 - row; c++) {
            stack += `<rect x="${f(x - 7 + c * 5.4 + row * 2.7)}" y="${f(y - row * 3.2)}" width="4.8" height="2.7" fill="${(row + c) % 2 ? '#a64c24' : '#8a3b1b'}"/>`;
          }
        }
        return stack;
      })
      .join('');
    return ground(r, 8, ['#9a4a24', '#b55c2d']) + mounds + bricks;
  },
  mountains(r) {
    const peaks = scatter(r, 12)
      .map(([x, y]) => {
        const w = 11 + r() * 7, h = 19 + r() * 12;
        const top = [x - w * 0.08, y - h];
        return (
          ellipse(x + 3, y + 1, w * 1.05, 3.2, '#4d525b') +
          poly([[x - w, y], top, [x + w, y]], '#9499a2') +
          poly([[x + w * 0.1, y], top, [x + w, y]], '#5c616b') +
          poly([[x - w * 0.55, y], top, [x - w * 0.2, y]], '#a9aeb6') +
          path(`M${f(top[0])},${f(top[1])}L${f(x + w * 0.1)},${f(y - h * 0.45)}L${f(x - w * 0.05)},${f(y - h * 0.2)}`, 'stroke="#474c55" stroke-width="0.9" fill="none"') +
          poly([[x - w * 0.4, y - h * 0.6], top, [x + w * 0.38, y - h * 0.62], [x + w * 0.16, y - h * 0.5], [x + w * 0.02, y - h * 0.6], [x - w * 0.16, y - h * 0.48]], '#f6f8fa') +
          poly([[x + w * 0.02, y - h * 0.6], top, [x + w * 0.38, y - h * 0.62], [x + w * 0.16, y - h * 0.5]], '#cfd6de')
        );
      })
      .join('');
    return ground(r, 9, ['#6d727b', '#858a93', '#5f7a52']) + peaks;
  },
  desert(r) {
    const dunes = scatter(r, 10)
      .map(([x, y]) => {
        const w = 14 + r() * 14, h = 6 + r() * 5;
        return (
          path(`M${f(x - w)},${f(y)}Q${f(x - w * 0.1)},${f(y - h * 2)} ${f(x + w)},${f(y)}Q${f(x)},${f(y - h * 0.5)} ${f(x - w)},${f(y)}Z`, 'fill="#c9a964"') +
          path(`M${f(x - w)},${f(y)}Q${f(x - w * 0.1)},${f(y - h * 2)} ${f(x + w)},${f(y)}`, 'stroke="#f0dcab" stroke-width="1.4" fill="none" stroke-linecap="round"')
        );
      })
      .join('');
    const cacti = scatter(r, 3)
      .map(([x, y]) => ellipse(x + 1.5, y + 1, 4, 1.2, '#b8975a') + path(`M${f(x)},${f(y)}v-9M${f(x - 3)},${f(y - 3)}v-3M${f(x - 3)},${f(y - 3)}h3M${f(x + 3)},${f(y - 5)}v-3M${f(x + 3)},${f(y - 5)}h-3`, 'stroke="#4f7a3a" stroke-width="2" fill="none" stroke-linecap="round"'))
      .join('');
    const stones = scatter(r, 10)
      .map(([x, y]) => circle(x, y, 1.2, '#a8884f'))
      .join('');
    return ground(r, 8, ['#e6d19c', '#d2b877']) + dunes + stones + cacti;
  },
};

/** A small sailing boat for a harbour, bow to the right. */
export function boat(): string {
  return (
    ellipse(0, 7.5, 12, 2.2, '#2468a3') +
    path('M-11,2H11L7,7.5H-7Z', 'fill="#7a5230"') +
    path('M-11,2H11L10.2,3.4H-10.2Z', 'fill="#a57845"') +
    path('M-1,2V-15', 'stroke="#4a3119" stroke-width="1.2"') +
    path('M0,-14Q9,-8 8,0H0Z', 'fill="#fbf6e6"') +
    path('M-2,-12Q-8,-6 -8,0H-2Z', 'fill="#e8dfc4"')
  );
}

export function tileArt(terrain: Terrain, seed: number): string {
  return ART[terrain](rand(seed));
}
