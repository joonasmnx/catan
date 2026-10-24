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
}

export interface ModeSpec {
  mode: Mode;
  label: string;
  players: number;
  /** Count per terrain index (forest, pasture, fields, hills, mountains, desert). */
  terrainCounts: readonly number[];
  tokens: readonly number[];
  /** Harbour types in clockwise order around the frame. */
  ports: readonly PortSpec[];
}

const g: PortSpec = { resource: null };
const p = (resource: Resource): PortSpec => ({ resource });

export const MODES: Record<Mode, ModeSpec> = {
  '4': {
    mode: '4',
    label: '4 players',
    players: 4,
    terrainCounts: [4, 4, 4, 3, 3, 1],
    tokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    // 4 generic + one 2:1 per resource.
    ports: [g, p('forest'), p('fields'), p('pasture'), g, p('mountains'), g, p('hills'), g],
  },
  '6': {
    mode: '6',
    label: '5–6 players',
    players: 6,
    terrainCounts: [6, 6, 6, 5, 5, 2],
    tokens: [
      2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
    ],
    // 5 generic + two wool + one of each other resource.
    ports: [
      g, p('pasture'), g, p('fields'), g, p('mountains'), g, p('pasture'), g, p('forest'), p('hills'),
    ],
  },
};

/** Dice pips: the number of ways two dice roll n, out of 36. */
export function pips(n: number): number {
  return n === 0 ? 0 : 6 - Math.abs(7 - n);
}

export const isRed = (n: number): boolean => n === 6 || n === 8;
