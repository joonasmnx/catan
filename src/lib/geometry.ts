// The board as a graph.
//
// Hexes use axial coordinates (q, r), pointy-top. Corners live on an exact
// integer lattice: a hex centre is at (X, Y) = (2q + r, 3r) and its six corners
// are offset by CORNER_OFFSETS. Pixel position is (X * √3/2, Y / 2) for unit
// hex size. Keeping vertices as integers means no floating-point keys.

import { MODES, type Mode, type PortSpec } from './components';

export interface Hex {
  q: number;
  r: number;
}

export interface Port extends PortSpec {
  /** The two vertex ids the harbour serves. */
  vertices: [number, number];
  /** Land hex the harbour edge belongs to. */
  hex: number;
}

export interface Geometry {
  mode: Mode;
  hexes: Hex[];
  /** neighbours[h] = adjacent hex indices. */
  neighbours: number[][];
  /** Adjacent hex pairs, each once (a < b). */
  hexEdges: [number, number][];
  /** dist[a * n + b] = graph distance between hexes over the board. */
  dist: Int8Array;
  /** Lattice coordinates of each vertex. */
  vertexXY: [number, number][];
  /** Land hexes touching each vertex (1–3). */
  vertexHexes: number[][];
  /** Vertices joined by an edge (the settlement distance rule). */
  vertexNeighbours: number[][];
  /** Corner vertex ids of each hex, clockwise from the top. */
  hexVertices: number[][];
  /** Coastal edges, clockwise from the westmost point, as vertex pairs. */
  coast: [number, number][];
  ports: Port[];
}

// Pointy-top corners clockwise from the top (screen coordinates, y down).
const CORNER_OFFSETS: [number, number][] = [
  [0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1],
];
const DIRS: Hex[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

/** Row layout: [r, first q, length]. */
const ROWS: Record<Mode, [number, number, number][]> = {
  // 3-4-5-4-3
  '4': [[-2, 0, 3], [-1, -1, 4], [0, -2, 5], [1, -2, 4], [2, -2, 3]],
  // 3-4-5-6-5-4-3, the 5–6 player extension frame
  '6': [[-3, 0, 3], [-2, -1, 4], [-1, -2, 5], [0, -3, 6], [1, -3, 5], [2, -3, 4], [3, -3, 3]],
};

export function hexCentre(h: Hex): [number, number] {
  return [2 * h.q + h.r, 3 * h.r];
}

export function latticeToPixel(X: number, Y: number): [number, number] {
  return [(X * Math.sqrt(3)) / 2, Y / 2];
}

const cache = new Map<Mode, Geometry>();

export function geometry(mode: Mode): Geometry {
  const hit = cache.get(mode);
  if (hit) return hit;
  const geo = build(mode);
  cache.set(mode, geo);
  return geo;
}

function build(mode: Mode): Geometry {
  const hexes: Hex[] = [];
  for (const [r, q0, len] of ROWS[mode]) {
    for (let i = 0; i < len; i++) hexes.push({ q: q0 + i, r });
  }
  const n = hexes.length;
  const index = new Map(hexes.map((h, i) => [`${h.q},${h.r}`, i]));

  const neighbours = hexes.map((h) =>
    DIRS.map((d) => index.get(`${h.q + d.q},${h.r + d.r}`)).filter((x): x is number => x !== undefined),
  );
  const hexEdges: [number, number][] = [];
  neighbours.forEach((ns, a) => ns.forEach((b) => a < b && hexEdges.push([a, b])));

  // Graph distance by BFS from every hex.
  const dist = new Int8Array(n * n).fill(-1);
  for (let s = 0; s < n; s++) {
    dist[s * n + s] = 0;
    const queue = [s];
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      for (const v of neighbours[u]) {
        if (dist[s * n + v] < 0) {
          dist[s * n + v] = dist[s * n + u] + 1;
          queue.push(v);
        }
      }
    }
  }

  // Vertices.
  const vertexId = new Map<string, number>();
  const vertexXY: [number, number][] = [];
  const vertexHexes: number[][] = [];
  const hexVertices = hexes.map((h, hi) => {
    const [cx, cy] = hexCentre(h);
    return CORNER_OFFSETS.map(([dx, dy]) => {
      const key = `${cx + dx},${cy + dy}`;
      let id = vertexId.get(key);
      if (id === undefined) {
        id = vertexXY.length;
        vertexId.set(key, id);
        vertexXY.push([cx + dx, cy + dy]);
        vertexHexes.push([]);
      }
      vertexHexes[id].push(hi);
      return id;
    });
  });

  // Edges: consecutive corners of a hex. Count land hexes per edge to find the coast.
  const edgeCount = new Map<string, { a: number; b: number; hexes: number[] }>();
  const vn = vertexXY.map(() => new Set<number>());
  hexVertices.forEach((vs, hi) => {
    for (let i = 0; i < 6; i++) {
      const a = vs[i], b = vs[(i + 1) % 6];
      vn[a].add(b);
      vn[b].add(a);
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const e = edgeCount.get(key) ?? { a: Math.min(a, b), b: Math.max(a, b), hexes: [] };
      e.hexes.push(hi);
      edgeCount.set(key, e);
    }
  });
  const vertexNeighbours = vn.map((s) => [...s].sort((x, y) => x - y));

  const coastEdges = [...edgeCount.values()].filter((e) => e.hexes.length === 1);
  const coast = walkCoast(coastEdges, vertexXY);
  const coastHex = new Map(coastEdges.map((e) => [`${e.a},${e.b}`, e.hexes[0]]));

  // Harbours spaced evenly along the coast, starting at the west.
  const specs = MODES[mode].ports;
  const step = coast.length / specs.length;
  const ports: Port[] = specs.map((spec, k) => {
    const [a, b] = coast[Math.floor(k * step + step / 2) % coast.length];
    const hex = coastHex.get(a < b ? `${a},${b}` : `${b},${a}`)!;
    return { ...spec, vertices: [a, b], hex };
  });

  return { mode, hexes, neighbours, hexEdges, dist, vertexXY, vertexHexes, vertexNeighbours, hexVertices, coast, ports };
}

/** Order coastal edges into one clockwise cycle starting at the westmost vertex. */
function walkCoast(edges: { a: number; b: number }[], xy: [number, number][]): [number, number][] {
  const adj = new Map<number, number[]>();
  for (const { a, b } of edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const start = [...adj.keys()].sort((u, v) => xy[u][0] - xy[v][0] || xy[u][1] - xy[v][1])[0];
  const cycle = [start];
  let prev = -1;
  let cur = start;
  for (;;) {
    const next = adj.get(cur)!.find((v) => v !== prev)!;
    if (next === start) break;
    cycle.push(next);
    prev = cur;
    cur = next;
  }
  // Shoelace: positive area in y-down coordinates means clockwise on screen.
  let area = 0;
  for (let i = 0; i < cycle.length; i++) {
    const [x1, y1] = xy[cycle[i]];
    const [x2, y2] = xy[cycle[(i + 1) % cycle.length]];
    area += x1 * y2 - x2 * y1;
  }
  if (area < 0) {
    cycle.reverse();
    cycle.unshift(cycle.pop()!);
  }
  return cycle.map((v, i) => [v, cycle[(i + 1) % cycle.length]]);
}
