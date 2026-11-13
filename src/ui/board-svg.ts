// Draws a board as an SVG string. Pure: same board in, same markup out.

import { DESERT, MODES, TERRAINS, isRed, pips, type Resource, type Terrain } from '../lib/components';
import { geometry, hexCentre, latticeToPixel } from '../lib/geometry';
import type { Board } from '../lib/board';
import { tileArt } from './tile-art';

const SIZE = 50; // hex circumradius in SVG units
const FRAME = 62; // sea beyond the outermost land corner

export const TERRAIN_NAME: Record<Terrain, string> = {
  forest: 'Wood',
  pasture: 'Wool',
  fields: 'Grain',
  hills: 'Brick',
  mountains: 'Ore',
  desert: 'Desert',
};
export const TERRAIN_LONG: Record<Terrain, string> = {
  forest: 'Forest',
  pasture: 'Pasture',
  fields: 'Fields',
  hills: 'Hills',
  mountains: 'Mountains',
  desert: 'Desert',
};

// A flat-top board is the pointy-top lattice turned 30° clockwise.
const COS30 = Math.sqrt(3) / 2;
let flat = false;
const px = (X: number, Y: number): [number, number] => {
  const [x, y] = latticeToPixel(X, Y);
  return flat ? [(x * COS30 - y / 2) * SIZE, (x / 2 + y * COS30) * SIZE] : [x * SIZE, y * SIZE];
};
const f = (v: number) => Math.round(v * 10) / 10;

/** Ground colour of each tile's illustration; also the legend swatches. */
export const TILE_COLOURS: Record<Terrain | 'sea' | 'land' | 'generic', string> = {
  forest: '#2a6534',
  pasture: '#9ccc5a',
  fields: '#e9bd3c',
  hills: '#a85429',
  mountains: '#777c85',
  desert: '#dcc58e',
  sea: '#2f80c2',
  land: '#ead9a6',
  generic: '#fbf8f1',
};

const SVG_CSS = [
  ...Object.entries(TILE_COLOURS).map(([k, v]) => `.t-${k}{fill:${v}}`),
  `.board-svg text{font-family:"Geist Variable",Geist,system-ui,-apple-system,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums;text-anchor:middle}`,
  `.frame{stroke:#2f80c2}`,
  `.shallows{fill:#6fb3e0;stroke:#6fb3e0;stroke-width:16;stroke-linejoin:round}`,
  `.beach{stroke:#ead9a6;stroke-width:7;stroke-linejoin:round}`,
  `.ink-dark{fill:#1b1b16}.ink-light{fill:#ffffff}`,
  `.token{fill:#efd9a7;stroke:#3b2a14;stroke-width:1.6}`,
  `.token-n{font-size:23px;font-weight:700;fill:#1b1b16}.token-n.red{fill:#c62a1c}`,
  `.pip{fill:#1b1b16}.pip.red{fill:#c62a1c}`,
  `.pier{fill:none;stroke:#8a6a43;stroke-width:4;stroke-linecap:round}`,
  `.port-disc{stroke:#ffffff;stroke-width:2}`,
  `.port-ratio{font-size:15px;font-weight:600}.port-name{font-size:11px;font-weight:500}`,
  `.caption{font-size:16px;font-weight:500;fill:#1b1b16}`,
].join('');

const CORNERS: [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];

function hexPoints(X: number, Y: number, inset = 0): string {
  const [cx, cy] = px(X, Y);
  return CORNERS.map(([dx, dy]) => {
    const [x, y] = px(X + dx, Y + dy);
    const k = 1 - inset / SIZE;
    return `${f(cx + (x - cx) * k)},${f(cy + (y - cy) * k)}`;
  }).join(' ');
}

export interface SvgOptions {
  /** Add the board code under the board (for the saved image). */
  caption?: string;
  /** Inline @font-face CSS (for the saved image, where page fonts do not load). */
  fontCss?: string;
}

export function boardSvg(board: Board, opts: SvgOptions = {}): string {
  const geo = geometry(board.mode);
  flat = MODES[board.mode].orientation === 'flat';
  const { terrain, token } = board.layout;

  // Sea frame: the convex hull of the land, widened by FRAME with round
  // corners (a stroke of twice the width), so harbours sit on the water.
  const landPts = geo.vertexXY.map(([X, Y]) => px(X, Y));
  const hull = convexHull(landPts);
  const xs = hull.map((p) => p[0]), ys = hull.map((p) => p[1]);
  const pad = FRAME + 2;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad + (opts.caption ? 44 : 0);

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(minX)} ${f(minY)} ${f(maxX - minX)} ${f(maxY - minY)}" ` +
      `role="img" aria-labelledby="board-title" class="board-svg board-${board.mode}">`,
  );
  out.push(`<title id="board-title">${describe(board)}</title>`);
  out.push(`<style>${opts.fontCss ?? ''}${SVG_CSS}</style>`);
  const hullPts = hull.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  out.push(`<polygon points="${hullPts}" class="t-sea frame" stroke-width="${FRAME * 2}" stroke-linejoin="round"/>`);
  // Shallow water, then the beach the tiles lie on.
  for (const h of geo.hexes) out.push(`<polygon points="${hexPoints(...hexCentre(h))}" class="shallows"/>`);
  for (const h of geo.hexes) out.push(`<polygon points="${hexPoints(...hexCentre(h))}" class="t-land beach"/>`);

  // Harbours: two piers from the coast edge to a badge in the sea.
  for (const port of geo.ports) {
    const [a, b] = port.vertices.map((v) => px(...geo.vertexXY[v]));
    const [lx, ly] = px(...hexCentre(geo.hexes[port.hex]));
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const bx = mx + (mx - lx) * 0.7, by = my + (my - ly) * 0.7;
    // Two jetties from the harbour's corners out towards its marker.
    const jetty = (p: number[]) => `M${f(p[0])},${f(p[1])}L${f(p[0] + (bx - p[0]) * 0.62)},${f(p[1] + (by - p[1]) * 0.62)}`;
    out.push(`<path d="${jetty(a)}${jetty(b)}" class="pier"/>`);
    const cls = port.resource ? `t-${port.resource}` : 't-generic';
    out.push(`<g class="port" transform="translate(${f(bx)},${f(by)})">`);
    out.push(`<circle r="22" class="${cls} port-disc"/>`);
    if (port.resource) {
      out.push(`<text y="0" class="port-ratio named ${inkClass(port.resource)}">2:1</text>`);
      out.push(`<text y="12" class="port-name ${inkClass(port.resource)}">${TERRAIN_NAME[port.resource]}</text>`);
    } else {
      out.push(`<text y="5" class="port-ratio ink-dark">3:1</text>`);
    }
    out.push(`</g>`);
  }

  geo.hexes.forEach((h, i) => {
    const [X, Y] = hexCentre(h);
    const [cx, cy] = px(X, Y);
    const t = TERRAINS[terrain[i]];
    out.push(`<clipPath id="hex${i}"><polygon points="${hexPoints(X, Y, 3)}"/></clipPath>`);
    out.push(`<polygon points="${hexPoints(X, Y, 3)}" class="t-${t} tile"/>`);
    out.push(`<g clip-path="url(#hex${i})"><g transform="translate(${f(cx)},${f(cy)})">${tileArt(t, i * 31 + terrain[i])}</g></g>`);
    if (terrain[i] !== DESERT) {
      const n = token[i];
      const red = isRed(n) ? ' red' : '';
      out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="21" class="token"/>`);
      out.push(`<text x="${f(cx)}" y="${f(cy + 5.5)}" class="token-n${red}">${n}</text>`);
      const k = pips(n);
      for (let d = 0; d < k; d++) {
        const dx = (d - (k - 1) / 2) * 4.8;
        out.push(`<circle cx="${f(cx + dx)}" cy="${f(cy + 13.5)}" r="1.8" class="pip${red}"/>`);
      }
    }
  });

  if (opts.caption) {
    out.push(
      `<text x="${f((minX + maxX) / 2)}" y="${f(maxY - 14)}" class="caption">${opts.caption}</text>`,
    );
  }
  out.push(`</svg>`);
  return out.join('');
}

/** Andrew's monotone chain. */
function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 1e-9) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

function inkClass(t: Terrain): string {
  return t === 'forest' || t === 'hills' || t === 'mountains' ? 'ink-light' : 'ink-dark';
}

export function describe(board: Board): string {
  const players = board.mode === '4' ? '4-player' : '5–6 player';
  return `${players} Catan board`;
}

/** Text version of the board for screen readers: one line per row, top to bottom (flat boards: per column, left to right). */
export function boardRows(board: Board): string[] {
  const geo = geometry(board.mode);
  const isFlat = MODES[board.mode].orientation === 'flat';
  const lines = new Map<number, { order: number; text: string }[]>();
  geo.hexes.forEach((h, i) => {
    const t = TERRAINS[board.layout.terrain[i]];
    const n = board.layout.token[i];
    const key = isFlat ? h.q : h.r;
    const order = isFlat ? h.r : h.q;
    lines.set(key, [...(lines.get(key) ?? []), { order, text: n ? `${TERRAIN_NAME[t]} ${n}` : TERRAIN_NAME[t] }]);
  });
  return [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, cells]) => cells.sort((a, b) => a.order - b.order).map((c) => c.text).join(', '));
}

export type { Resource };
