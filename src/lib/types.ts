export type Resource =
  | 'forest'
  | 'pasture'
  | 'fields'
  | 'mountains'
  | 'hills'
  | 'desert'
  | 'water';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Tile {
  resource: Resource;
  number: number | null;
  coord: HexCoord;
}

export interface Port {
  type: '2:1' | '3:1';
  resource: Resource | null;
  coord: HexCoord;
}

export interface CIBIScore {
  total: number;
  pipBalance: number;
  intersectionQuality: number;
  resourceClustering: number;
  redNumberSpread: number;
  desertPlacement: number;
}

export interface Board {
  tiles: Tile[];
  coordList: HexCoord[];
  coordIndex: Record<string, number>;
  cibi: CIBIScore;
  attempts: number;
  waterHexes?: HexCoord[];
  ports?: Port[];
}

export type GameMode = 'standard4' | 'standard56' | 'seafarers4' | 'seafarers56';
export type LayoutType = 'classic' | 'archipelago' | 'twin';

export const RESOURCE_COLORS: Record<Resource, { base: string; mid: string; light: string }> = {
  forest:    { base: '#1b4d1b', mid: '#2d7a2d', light: '#3da63d' },
  pasture:   { base: '#3d7a00', mid: '#5ab300', light: '#7dcc1a' },
  fields:    { base: '#b8860b', mid: '#d4a017', light: '#f0c040' },
  mountains: { base: '#3c4a5c', mid: '#5a6e87', light: '#7a94b0' },
  hills:     { base: '#8b3a1e', mid: '#c0522a', light: '#d97040' },
  desert:    { base: '#c8b560', mid: '#ddc87a', light: '#eedc98' },
  water:     { base: '#0d1f3c', mid: '#1a3a6e', light: '#2455a0' },
};

export const RESOURCE_LABELS: Record<Resource, string> = {
  forest:    'Forest',
  pasture:   'Pasture',
  fields:    'Fields',
  mountains: 'Mountains',
  hills:     'Hills',
  desert:    'Desert',
  water:     'Water',
};

export const PIPS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};
