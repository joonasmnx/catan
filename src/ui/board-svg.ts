// Draws a board as an SVG string. Pure: same board in, same markup out.

import { DESERT, TERRAINS, isRed, pips, type Resource, type Terrain } from '../lib/components';
import { geometry, hexCentre, latticeToPixel } from '../lib/geometry';
import type { Board } from '../lib/board';

const SIZE = 50; // hex circumradius in SVG units
const FRAME = 52; // sea beyond the outermost land corner

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

const px = (X: number, Y: number): [number, number] => {
  const [x, y] = latticeToPixel(X, Y);
  return [x * SIZE, y * SIZE];
};
const f = (v: number) => Math.round(v * 10) / 10;

/** Tile colours taken from the printed tiles; text classes keep 4.5:1 on each. */
export const TILE_COLOURS: Record<Terrain | 'sea' | 'land' | 'generic', string> = {
  forest: '#2e5b30',
  pasture: '#93c255',
  fields: '#e8bb3f',
  hills: '#b0502d',
  mountains: '#646a70',
  desert: '#dcc58e',
  sea: '#3d7bab',
  land: '#efe6cf',
  generic: '#fbf8f1',
};

const SVG_CSS = [
  ...Object.entries(TILE_COLOURS).map(([k, v]) => `.t-${k}{fill:${v}}`),
  `.board-svg text{font-family:"Geist Variable",Geist,system-ui,-apple-system,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums;text-anchor:middle}`,
  `.frame{stroke:#3d7bab}`,
  `.tile-name{font-size:12px;font-weight:500}`,
  `.ink-dark{fill:#1b1b16}.ink-light{fill:#ffffff}`,
  `.token{fill:#f7efd9}`,
  `.token-n{font-size:21px;font-weight:600;fill:#1b1b16}.token-n.red{fill:#b3261e}`,
  `.pip{fill:#1b1b16}.pip.red{fill:#b3261e}`,
  `.pier{fill:none;stroke:#efe6cf;stroke-width:3;stroke-linejoin:round}`,
  `.port-ratio{font-size:15px;font-weight:600}.port-name{font-size:11px;font-weight:500}`,
  `.spot-disc{stroke:#111111;stroke-width:2.5}.spot-best .spot-disc{fill:#111111}.spot-worst .spot-disc{fill:#ffffff}`,
  `.spot-n{font-size:12px;font-weight:600}.spot-best .spot-n{fill:#ffffff}.spot-worst .spot-n{fill:#111111}`,
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
  for (const h of geo.hexes) out.push(`<polygon points="${hexPoints(...hexCentre(h))}" class="t-land"/>`);

  // Harbours: two piers from the coast edge to a badge in the sea.
  for (const port of geo.ports) {
    const [a, b] = port.vertices.map((v) => px(...geo.vertexXY[v]));
    const [lx, ly] = px(...hexCentre(geo.hexes[port.hex]));
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const bx = mx + (mx - lx) * 0.7, by = my + (my - ly) * 0.7;
    out.push(
      `<path d="M${f(a[0])},${f(a[1])}L${f(bx)},${f(by)}L${f(b[0])},${f(b[1])}" class="pier"/>`,
    );
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
    out.push(`<polygon points="${hexPoints(X, Y, 1.5)}" class="t-${t} tile"/>`);
    out.push(
      `<text x="${f(cx)}" y="${f(cy - 27)}" class="tile-name ${inkClass(t)}">${TERRAIN_NAME[t]}</text>`,
    );
    if (terrain[i] !== DESERT) {
      const n = token[i];
      const red = isRed(n) ? ' red' : '';
      out.push(`<circle cx="${f(cx)}" cy="${f(cy + 4)}" r="23" class="token"/>`);
      out.push(`<text x="${f(cx)}" y="${f(cy + 10.5)}" class="token-n${red}">${n}</text>`);
      const k = pips(n);
      for (let d = 0; d < k; d++) {
        const dx = (d - (k - 1) / 2) * 5;
        out.push(`<circle cx="${f(cx + dx)}" cy="${f(cy + 19)}" r="1.9" class="pip${red}"/>`);
      }
    }
  });

  // Best and worst starting spot from the greedy setup draft.
  const picks = board.metrics.draft;
  const marks: [number, string, string][] = [
    [picks[0], '1', 'spot-best'],
    [picks[picks.length - 1], String(picks.length), 'spot-worst'],
  ];
  for (const [v, label, cls] of marks) {
    const [x, y] = px(...geo.vertexXY[v]);
    out.push(`<g class="${cls}" transform="translate(${f(x)},${f(y)})">`);
    out.push(`<circle r="11" class="spot-disc"/><text y="4.3" class="spot-n">${label}</text></g>`);
  }

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

/** Text version of the board for screen readers: one line per row. */
export function boardRows(board: Board): string[] {
  const geo = geometry(board.mode);
  const rows = new Map<number, string[]>();
  geo.hexes.forEach((h, i) => {
    const t = TERRAINS[board.layout.terrain[i]];
    const n = board.layout.token[i];
    rows.set(h.r, [...(rows.get(h.r) ?? []), n ? `${TERRAIN_NAME[t]} ${n}` : TERRAIN_NAME[t]]);
  });
  return [...rows.values()].map((cells) => cells.join(', '));
}

export type { Resource };
