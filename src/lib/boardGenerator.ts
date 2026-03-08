import type { Board, CIBIScore, GameMode, HexCoord, LayoutType, Port, Tile } from './types';
import { hexDist, hexNeighbors, getLandCoords, waterCoords, HEX_DIRS } from './hexGrid';
import { PIPS } from './types';

const R = {
  FOREST: 'forest' as const,
  PASTURE: 'pasture' as const,
  FIELDS: 'fields' as const,
  MOUNTAINS: 'mountains' as const,
  HILLS: 'hills' as const,
  DESERT: 'desert' as const,
  WATER: 'water' as const,
};

const TILE_COUNTS: Record<string, Record<string, number>> = {
  standard4: {
    forest: 4, pasture: 4, fields: 4, mountains: 3, hills: 3, desert: 1,
  },
  standard56: {
    forest: 6, pasture: 6, fields: 6, mountains: 5, hills: 5, desert: 2,
  },
};
TILE_COUNTS.seafarers4 = TILE_COUNTS.standard4;
TILE_COUNTS.seafarers56 = TILE_COUNTS.standard56;

const NUMBERS_4P = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
const NUMBERS_56P = [2,2, 3,3,3, 4,4,4, 5,5,5, 6,6,6, 8,8,8, 9,9,9, 10,10,10, 11,11,11, 12,12];

const PORTS: Record<string, Array<{ type: '2:1' | '3:1'; resource: typeof R.FOREST | typeof R.PASTURE | typeof R.FIELDS | typeof R.MOUNTAINS | typeof R.HILLS | null }>> = {
  standard4: [
    { type: '2:1', resource: R.FOREST },
    { type: '2:1', resource: R.PASTURE },
    { type: '2:1', resource: R.FIELDS },
    { type: '2:1', resource: R.MOUNTAINS },
    { type: '2:1', resource: R.HILLS },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
  ],
  standard56: [
    { type: '2:1', resource: R.FOREST },
    { type: '2:1', resource: R.PASTURE },
    { type: '2:1', resource: R.FIELDS },
    { type: '2:1', resource: R.MOUNTAINS },
    { type: '2:1', resource: R.HILLS },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
    { type: '3:1', resource: null },
  ],
};
PORTS.seafarers4 = PORTS.standard4;
PORTS.seafarers56 = PORTS.standard56;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTileList(counts: Record<string, number>): string[] {
  const tiles: string[] = [];
  for (const [res, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) tiles.push(res);
  }
  return tiles;
}

function buildNumberList(mode: string): number[] {
  return [...(mode.includes('56') ? NUMBERS_56P : NUMBERS_4P)];
}

function checkNoAdjacentSameResource(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].resource === R.DESERT) continue;
    const neighbors = hexNeighbors(coordList[i]);
    for (const nb of neighbors) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && j !== i && tiles[j].resource === tiles[i].resource) return false;
    }
  }
  return true;
}

function checkNoAdjacentReds(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): boolean {
  const reds = new Set([6, 8]);
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].number || !reds.has(tiles[i].number!)) continue;
    const neighbors = hexNeighbors(coordList[i]);
    for (const nb of neighbors) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && tiles[j].number && reds.has(tiles[j].number!)) return false;
    }
  }
  return true;
}

function checkNoAdjacentSameNumber(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].number) continue;
    const neighbors = hexNeighbors(coordList[i]);
    for (const nb of neighbors) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && j > i && tiles[j].number === tiles[i].number) return false;
    }
  }
  return true;
}

function scorePipBalance(tiles: Tile[]): number {
  const resources = [R.FOREST, R.PASTURE, R.FIELDS, R.MOUNTAINS, R.HILLS];
  const pipTotals: Record<string, number> = {};
  const pipCounts: Record<string, number> = {};
  for (const r of resources) { pipTotals[r] = 0; pipCounts[r] = 0; }
  for (const t of tiles) {
    if (!resources.includes(t.resource as typeof R.FOREST) || !t.number) continue;
    pipTotals[t.resource] += PIPS[t.number] || 0;
    pipCounts[t.resource]++;
  }
  const avgs = resources.map((r) => pipCounts[r] > 0 ? pipTotals[r] / pipCounts[r] : 0);
  const mean = avgs.reduce((s, v) => s + v, 0) / avgs.length;
  const variance = avgs.reduce((s, v) => s + (v - mean) ** 2, 0) / avgs.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.min(100, (1 - stdDev / 4.0) * 100));
}

function scoreIntersectionQuality(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): number {
  const tileMap: Record<string, Tile> = {};
  for (let i = 0; i < coordList.length; i++) {
    tileMap[`${coordList[i].q},${coordList[i].r}`] = tiles[i];
  }
  const vertexSet = new Set<string>();
  const vertexTriplets: Tile[][] = [];
  for (let i = 0; i < coordList.length; i++) {
    const h = coordList[i];
    for (let d = 0; d < 6; d++) {
      const d1 = HEX_DIRS[d];
      const d2 = HEX_DIRS[(d + 1) % 6];
      const nb1 = { q: h.q + d1.q, r: h.r + d1.r };
      const nb2 = { q: h.q + d2.q, r: h.r + d2.r };
      const k1 = `${nb1.q},${nb1.r}`;
      const k2 = `${nb2.q},${nb2.r}`;
      if (!tileMap[k1] || !tileMap[k2]) continue;
      const keys = [`${h.q},${h.r}`, k1, k2].sort();
      const vKey = keys.join('|');
      if (vertexSet.has(vKey)) continue;
      vertexSet.add(vKey);
      vertexTriplets.push([tileMap[`${h.q},${h.r}`], tileMap[k1], tileMap[k2]]);
    }
  }
  if (vertexTriplets.length === 0) return 50;
  let totalScore = 0;
  for (const triplet of vertexTriplets) {
    const resources = new Set(triplet.filter((t) => t.resource !== R.DESERT).map((t) => t.resource));
    const pips = triplet.reduce((s, t) => s + (t.number ? (PIPS[t.number] || 0) : 0), 0);
    const diversityScore = (resources.size / 3) * 50;
    let pipScore: number;
    if (pips >= 5 && pips <= 14) {
      pipScore = 50 - Math.abs(pips - 9.5) * 3;
    } else if (pips < 5) {
      pipScore = (pips / 5) * 30;
    } else {
      pipScore = Math.max(0, 50 - (pips - 14) * 5);
    }
    pipScore = Math.max(0, Math.min(50, pipScore));
    totalScore += diversityScore + pipScore;
  }
  return Math.min(100, totalScore / vertexTriplets.length);
}

function scoreResourceClustering(tiles: Tile[], coordList: HexCoord[]): number {
  const resources = [R.FOREST, R.PASTURE, R.FIELDS, R.MOUNTAINS, R.HILLS];
  const byResource: Record<string, HexCoord[]> = {};
  for (const r of resources) byResource[r] = [];
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (byResource[t.resource]) byResource[t.resource].push(coordList[i]);
  }
  let totalMinDist = 0;
  let count = 0;
  for (const r of resources) {
    const coords = byResource[r];
    if (coords.length < 2) continue;
    for (let i = 0; i < coords.length; i++) {
      let minD = Infinity;
      for (let j = 0; j < coords.length; j++) {
        if (i === j) continue;
        minD = Math.min(minD, hexDist(coords[i], coords[j]));
      }
      totalMinDist += minD;
      count++;
    }
  }
  if (count === 0) return 50;
  const avgMinDist = totalMinDist / count;
  return Math.max(0, Math.min(100, (avgMinDist - 1) / 3 * 100));
}

function scoreRedNumberSpread(tiles: Tile[], coordList: HexCoord[]): number {
  const reds: HexCoord[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].number === 6 || tiles[i].number === 8) reds.push(coordList[i]);
  }
  if (reds.length < 2) return 100;
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < reds.length; i++) {
    for (let j = i + 1; j < reds.length; j++) {
      totalDist += hexDist(reds[i], reds[j]);
      pairs++;
    }
  }
  return Math.max(0, Math.min(100, (totalDist / pairs / 5) * 100));
}

function scoreDesertPlacement(tiles: Tile[], coordList: HexCoord[]): number {
  const deserts: HexCoord[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].resource === R.DESERT) deserts.push(coordList[i]);
  }
  if (deserts.length === 0) return 100;
  const avgDist = deserts.reduce((s, h) => s + hexDist(h, { q: 0, r: 0 }), 0) / deserts.length;
  return Math.max(0, Math.min(100, (avgDist / 3) * 100));
}

function computeCIBI(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): CIBIScore {
  const s1 = scorePipBalance(tiles);
  const s2 = scoreIntersectionQuality(tiles, coordList, coordIndex);
  const s3 = scoreResourceClustering(tiles, coordList);
  const s4 = scoreRedNumberSpread(tiles, coordList);
  const s5 = scoreDesertPlacement(tiles, coordList);
  const total = s1 * 0.30 + s2 * 0.30 + s3 * 0.20 + s4 * 0.10 + s5 * 0.10;
  return {
    total: Math.round(total),
    pipBalance: Math.round(s1),
    intersectionQuality: Math.round(s2),
    resourceClustering: Math.round(s3),
    redNumberSpread: Math.round(s4),
    desertPlacement: Math.round(s5),
  };
}

export function generateBoard(mode: GameMode, layout: LayoutType = 'classic'): Board {
  const isSeafarers = mode.includes('seafarers');
  const coordList = getLandCoords(mode, layout);
  const coordIndex: Record<string, number> = {};
  for (let i = 0; i < coordList.length; i++) {
    coordIndex[`${coordList[i].q},${coordList[i].r}`] = i;
  }
  const tilePool = buildTileList(TILE_COUNTS[mode]);
  const numberPool = buildNumberList(mode);
  const MAX_ATTEMPTS = 2000;
  let bestBoard: Board | null = null;
  let bestScore = -1;
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts++;
    const resources = shuffle(tilePool);
    const tilesSoFar: Tile[] = resources.map((res, i) => ({
      resource: res as Tile['resource'],
      number: null,
      coord: coordList[i],
    }));
    if (!checkNoAdjacentSameResource(tilesSoFar, coordList, coordIndex)) continue;
    const nonDesertIndices = tilesSoFar
      .map((t, i) => (t.resource !== R.DESERT ? i : null))
      .filter((i): i is number => i !== null);
    const numbers = shuffle(numberPool);
    if (nonDesertIndices.length !== numbers.length) continue;
    for (let k = 0; k < nonDesertIndices.length; k++) {
      tilesSoFar[nonDesertIndices[k]].number = numbers[k];
    }
    if (!checkNoAdjacentReds(tilesSoFar, coordList, coordIndex)) continue;
    if (!checkNoAdjacentSameNumber(tilesSoFar, coordList, coordIndex)) continue;
    const cibi = computeCIBI(tilesSoFar, coordList, coordIndex);
    if (cibi.total > bestScore) {
      bestScore = cibi.total;
      bestBoard = { tiles: tilesSoFar, coordList, coordIndex, cibi, attempts };
    }
  }

  if (!bestBoard) {
    const resources = shuffle(tilePool);
    const tiles: Tile[] = resources.map((res, i) => ({
      resource: res as Tile['resource'],
      number: null,
      coord: coordList[i],
    }));
    const nonDesert = tiles.map((t, i) => (t.resource !== R.DESERT ? i : null)).filter((i): i is number => i !== null);
    const numbers = shuffle(numberPool);
    for (let k = 0; k < Math.min(nonDesert.length, numbers.length); k++) {
      tiles[nonDesert[k]].number = numbers[k];
    }
    const cibi = computeCIBI(tiles, coordList, coordIndex);
    bestBoard = { tiles, coordList, coordIndex, cibi, attempts: MAX_ATTEMPTS };
  }

  if (isSeafarers) {
    const waterHexes = waterCoords(coordList);
    const landSet = new Set(coordList.map((h) => `${h.q},${h.r}`));
    const portCandidates = waterHexes.filter((w) =>
      hexNeighbors(w).some((n) => landSet.has(`${n.q},${n.r}`))
    );
    const portList = shuffle([...PORTS[mode]]);
    const ports: Port[] = [];
    const usedWater = new Set<string>();
    for (let p = 0; p < portList.length && p < portCandidates.length; p++) {
      let placed = false;
      for (const wh of portCandidates) {
        const wk = `${wh.q},${wh.r}`;
        if (usedWater.has(wk)) continue;
        const tooClose = ports.some((pp) => hexDist(pp.coord, wh) < 2);
        if (tooClose && ports.length < portList.length - 1) continue;
        usedWater.add(wk);
        ports.push({ ...portList[p], coord: wh } as Port);
        placed = true;
        break;
      }
      if (!placed && portCandidates.length > p) {
        ports.push({ ...portList[p], coord: portCandidates[p] } as Port);
      }
    }
    bestBoard.waterHexes = waterHexes;
    bestBoard.ports = ports;
  }

  return bestBoard;
}
