// Official component counts.
//
// Base game (4 players): 19 terrain hexes, 18 number tokens, 9 harbours.
// 5–6 Player Extension adds 11 hexes (2 each of forest, pasture, fields,
// hills, mountains + 1 desert), brings its own full set of 28 lettered number
// tokens (two each of 2 and 12, three of every other number) and 2 harbours
// (one 3:1, one wool 2:1). Source: CATAN 5–6 Player Extension rulebook,
// component list (Catan GmbH / Catan Studio); base game rulebook.

export const RESOURCES = ['forest', 'pasture', 'fields', 'hills', 'mountains'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Terrain = Resource | 'desert';

/** Terrain index 0..4 are the RESOURCES, 5 is desert. */
export const DESERT = 5;
export const TERRAINS: readonly Terrain[] = [...RESOURCES, 'desert'];

export type Mode = '4' | '6';

export interface PortSpec {
  /** null = generic 3:1, otherwise 2:1 for that resource. */
  resource: Resource | null;
  /**
   * Where the harbour is printed on the frame: the land hex (axial q, r) and the
   * axial direction of the sea hex across the harbour edge. Without it the
   * harbour is spaced evenly along the coast.
   */
  at?: { q: number; r: number; dir: [number, number] };
}

export interface ModeSpec {
  mode: Mode;
  label: string;
  players: number;
  /** Count per terrain index (forest, pasture, fields, hills, mountains, desert). */
  terrainCounts: readonly number[];
  tokens: readonly number[];
  /** Harbours in clockwise order around the frame. */
  ports: readonly PortSpec[];
  /** How the board is drawn: flat-top hexes in columns (the lattice turned 30°), or pointy-top hexes in rows. */
  orientation: 'flat' | 'pointy';
}


export const MODES: Record<Mode, ModeSpec> = {
  '4': {
    mode: '4',
    label: '4 players',
    players: 4,
    terrainCounts: [4, 4, 4, 3, 3, 1],
    tokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    // The printed frame, from the user's reference image (flat-top, columns
    // 3-4-5-4-3), clockwise from the top. Axial directions: (0,-1) top,
    // (1,-1) upper right, (1,0) lower right, (0,1) bottom, (-1,1) lower left,
    // (-1,0) upper left. 4 generic + one 2:1 per resource.
    ports: [
      { resource: 'mountains', at: { q: 0, r: -2, dir: [0, -1] } },
      { resource: null, at: { q: 1, r: -2, dir: [1, -1] } },
      { resource: 'hills', at: { q: 2, r: -1, dir: [1, -1] } },
      { resource: null, at: { q: 2, r: 0, dir: [1, 0] } },
      { resource: 'fields', at: { q: 1, r: 1, dir: [0, 1] } },
      { resource: 'pasture', at: { q: -1, r: 2, dir: [0, 1] } },
      { resource: null, at: { q: -2, r: 2, dir: [-1, 1] } },
      { resource: 'forest', at: { q: -2, r: 1, dir: [-1, 0] } },
      { resource: null, at: { q: -1, r: -1, dir: [-1, 0] } },
    ],
    orientation: 'flat',
  },
  '6': {
    mode: '6',
    label: '5–6 players',
    players: 6,
    terrainCounts: [6, 6, 6, 5, 5, 2],
    tokens: [
      2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
    ],
    // The printed 5–6 frame, from the user's reference image (pointy-top, rows
    // 3-4-5-6-5-4-3), clockwise from the top left. Axial directions here:
    // (1,0) right, (1,-1) upper right, (0,-1) upper left, (-1,0) left,
    // (-1,1) lower left, (0,1) lower right. Counting coast edges clockwise the
    // harbours sit at 0, 3, 7, 12, 15, 18, 21, 24, 27, 30, 33 of 38: the base
    // frame's 3-4-3 spacing with the extension pieces let in.
    // 5 generic + two wool + one of each other resource.
    ports: [
      { resource: null, at: { q: 0, r: -3, dir: [0, -1] } },
      { resource: 'pasture', at: { q: 1, r: -3, dir: [1, -1] } },
      { resource: null, at: { q: 2, r: -2, dir: [1, -1] } },
      { resource: null, at: { q: 2, r: 0, dir: [1, 0] } },
      { resource: 'hills', at: { q: 1, r: 1, dir: [0, 1] } },
      { resource: 'pasture', at: { q: -1, r: 3, dir: [1, 0] } },
      { resource: 'forest', at: { q: -2, r: 3, dir: [0, 1] } },
      { resource: null, at: { q: -3, r: 3, dir: [-1, 1] } },
      { resource: 'fields', at: { q: -3, r: 2, dir: [-1, 0] } },
      { resource: null, at: { q: -3, r: 0, dir: [-1, 1] } },
      { resource: 'mountains', at: { q: -2, r: -1, dir: [-1, 0] } },
    ],
    orientation: 'pointy',
  },
};

/** Dice pips: the number of ways two dice roll n, out of 36. */
export function pips(n: number): number {
  return n === 0 ? 0 : 6 - Math.abs(7 - n);
}

export const isRed = (n: number): boolean => n === 6 || n === 8;
