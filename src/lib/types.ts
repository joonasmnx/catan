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
  forest:    { base: '#0e4a28', mid: '#177040', light: '#1ea058' },  // deep emerald-green
  pasture:   { base: '#3a7800', mid: '#60c000', light: '#88e020' },  // bright lime-green
  fields:    { base: '#b88808', mid: '#dab018', light: '#f8d040' },
  mountains: { base: '#404e60', mid: '#5e7490', light: '#80a0c0' },
  hills:     { base: '#922a14', mid: '#c84020', light: '#e86040' },
  desert:    { base: '#c0aa48', mid: '#d8c268', light: '#ecd890' },
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
