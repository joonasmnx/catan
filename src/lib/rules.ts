// The hard rules. A board that breaks any of these is never shown.

import { DESERT, MODES, RESOURCES, isRed, type Mode } from './components';
import { geometry } from './geometry';

/** A placed board: terrain index and number token (0 = none) per hex. */
export interface Layout {
  terrain: number[];
  token: number[];
}

export type Violation =
  | { kind: 'same-resource'; hexes: [number, number] }
  | { kind: 'red-touch'; hexes: [number, number] }
  | { kind: 'same-number'; hexes: [number, number] }
  | { kind: 'token-on-desert' | 'missing-token'; hex: number }
  | { kind: 'red-spread'; counts: number[] }
  | { kind: 'wrong-counts'; detail: string };

/** True when hexes a and b may sit next to each other. */
export function pairOk(terrainA: number, tokenA: number, terrainB: number, tokenB: number): boolean {
  if (terrainA === terrainB && terrainA !== DESERT) return false;
  if (tokenA !== 0 && tokenA === tokenB) return false;
  if (isRed(tokenA) && isRed(tokenB)) return false;
  return true;
}

/** How many 6s and 8s sit on each resource, in RESOURCES order. */
export function redCounts(layout: Layout): number[] {
  const counts = RESOURCES.map(() => 0);
  layout.token.forEach((t, h) => {
    if (isRed(t) && layout.terrain[h] !== DESERT) counts[layout.terrain[h]]++;
  });
  return counts;
}

/**
 * The 6s and 8s are shared out as evenly as the pieces allow: no resource has
 * two while another has none. With four reds (4 players) that puts them on
 * four different resources; with six (5–6 players) every resource has one
 * and a single resource has two.
 */
export function redSpreadOk(layout: Layout): boolean {
  const c = redCounts(layout);
  return Math.max(...c) - Math.min(...c) <= 1;
}

/** Check only the pairs that touch hex h. */
export function hexOk(mode: Mode, layout: Layout, h: number): boolean {
  const { terrain, token } = layout;
  for (const nb of geometry(mode).neighbours[h]) {
    if (!pairOk(terrain[h], token[h], terrain[nb], token[nb])) return false;
  }
  return true;
}

export function violations(mode: Mode, layout: Layout): Violation[] {
  const geo = geometry(mode);
  const spec = MODES[mode];
  const out: Violation[] = [];
  const { terrain, token } = layout;

  for (const [a, b] of geo.hexEdges) {
    if (terrain[a] === terrain[b] && terrain[a] !== DESERT) out.push({ kind: 'same-resource', hexes: [a, b] });
    if (isRed(token[a]) && isRed(token[b])) out.push({ kind: 'red-touch', hexes: [a, b] });
    if (token[a] !== 0 && token[a] === token[b]) out.push({ kind: 'same-number', hexes: [a, b] });
  }
  if (!redSpreadOk(layout)) out.push({ kind: 'red-spread', counts: redCounts(layout) });
  terrain.forEach((t, h) => {
    if (t === DESERT && token[h] !== 0) out.push({ kind: 'token-on-desert', hex: h });
    if (t !== DESERT && token[h] === 0) out.push({ kind: 'missing-token', hex: h });
  });

  if (terrain.length !== geo.hexes.length || token.length !== geo.hexes.length) {
    out.push({ kind: 'wrong-counts', detail: 'hex count' });
  }
  const counts = spec.terrainCounts.map((_, i) => terrain.filter((t) => t === i).length);
  if (counts.join() !== spec.terrainCounts.join()) {
    out.push({ kind: 'wrong-counts', detail: `terrain ${counts.join()}` });
  }
  const placed = token.filter((t) => t !== 0).sort((a, b) => a - b);
  if (placed.join() !== [...spec.tokens].sort((a, b) => a - b).join()) {
    out.push({ kind: 'wrong-counts', detail: `tokens ${placed.join()}` });
  }
  return out;
}
