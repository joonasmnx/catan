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
  tiles: Tile[], coordIndex: Record<string, number>
): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].resource === R.DESERT) continue;
    // Use tile's own coord (matches how coordIndex was built)
    for (const nb of hexNeighbors(tiles[i].coord)) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && j !== i && tiles[j].resource === tiles[i].resource) return false;
    }
  }
  return true;
}

function checkNoAdjacentReds(
  tiles: Tile[], coordIndex: Record<string, number>
): boolean {
  const reds = new Set([6, 8]);
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].number || !reds.has(tiles[i].number!)) continue;
    for (const nb of hexNeighbors(tiles[i].coord)) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && tiles[j].number && reds.has(tiles[j].number!)) return false;
    }
  }
  return true;
}

function checkNoAdjacentSameNumber(
  tiles: Tile[], coordIndex: Record<string, number>
): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].number) continue;
    for (const nb of hexNeighbors(tiles[i].coord)) {
      const j = coordIndex[`${nb.q},${nb.r}`];
      if (j !== undefined && j < tiles.length && j > i && tiles[j].number === tiles[i].number) return false;
    }
  }
  return true;
}

/** Distribute numbers so each resource type gets a spread of pip values.
 *  Sorts numbers best-first, then assigns round-robin across resource types.
 *  When coordIndex is provided, retries position shuffles up to MAX_INNER
 *  times internally to satisfy no-adjacent-same-number before returning. */
function assignNumbersBalanced(
  tiles: Tile[], mode: string, coordIndex?: Record<string, number>
): boolean {
  const numberPool = buildNumberList(mode);
  const resources = [R.FOREST, R.PASTURE, R.FIELDS, R.MOUNTAINS, R.HILLS];
  const groupIndices: Record<string, number[]> = {};
  for (const r of resources) groupIndices[r] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].resource !== R.DESERT && groupIndices[tiles[i].resource]) {
      groupIndices[tiles[i].resource].push(i);
    }
  }
  const nonDesertCount = resources.reduce((s, r) => s + groupIndices[r].length, 0);
  if (nonDesertCount !== numberPool.length) return false;

  // Sort numbers best-first (highest pip value first), shuffle within same pip tier for variety
  const sortedNums = [...numberPool].sort((a, b) => {
    const diff = (PIPS[b] || 0) - (PIPS[a] || 0);
    return diff !== 0 ? diff : Math.random() - 0.5;
  });

  // Round-robin slot sequence across resources (shuffled order per generation)
  const activeResources = shuffle(resources.filter(r => groupIndices[r].length > 0));
  const remaining: Record<string, number> = {};
  for (const r of activeResources) remaining[r] = groupIndices[r].length;
  const slots: string[] = [];
  let anyLeft = true;
  while (anyLeft) {
    anyLeft = false;
    for (const r of activeResources) {
      if (remaining[r] > 0) { slots.push(r); remaining[r]--; anyLeft = true; }
    }
  }

  // Pair sorted numbers with slots → each resource gets proportional share of good numbers
  const assignedNums: Record<string, number[]> = {};
  for (const r of resources) assignedNums[r] = [];
  for (let k = 0; k < slots.length; k++) assignedNums[slots[k]].push(sortedNums[k]);

  // Retry position shuffles to satisfy no-adjacent-same-number.
  // With balanced assignment, same numbers land on different resources whose tiles
  // border each other, making same-number adjacency common — so we need retries.
  const MAX_INNER = coordIndex ? 40 : 1;
  for (let retry = 0; retry < MAX_INNER; retry++) {
    for (const r of resources) {
      const nums = shuffle(assignedNums[r]);
      const indices = shuffle([...groupIndices[r]]);
      for (let k = 0; k < indices.length; k++) tiles[indices[k]].number = nums[k];
    }
    if (!coordIndex || checkNoAdjacentSameNumber(tiles, coordIndex)) return true;
  }
  // Could not satisfy no-adjacent-same-number in MAX_INNER retries;
  // leave tiles with the last assignment and let the caller decide.
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
  // Max realistic stdDev between resource pip averages is ~2.5; use 2.5 for full-range sensitivity
  return Math.max(0, Math.min(100, (1 - stdDev / 2.5) * 100));
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

function scoreResourceClustering(tiles: Tile[]): number {
  const resources = [R.FOREST, R.PASTURE, R.FIELDS, R.MOUNTAINS, R.HILLS];
  const byResource: Record<string, HexCoord[]> = {};
  for (const r of resources) byResource[r] = [];
  for (const t of tiles) {
    if (byResource[t.resource]) byResource[t.resource].push(t.coord);
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
        const d = hexDist(coords[i], coords[j]);
        if (d < 2) return 0; // adjacent same-resource tiles → max penalty
        minD = Math.min(minD, d);
      }
      totalMinDist += minD;
      count++;
    }
  }
  if (count === 0) return 100;
  const avgMinDist = totalMinDist / count;
  // After no-adjacent constraint, minDist >= 2.
  // Map 2→20, 3→70, ≥4→100 to strongly reward well-separated resources.
  return Math.max(0, Math.min(100, (avgMinDist - 2) * 50 + 20));
}

function scoreRedNumberSpread(tiles: Tile[]): number {
  const reds: HexCoord[] = [];
  for (const t of tiles) {
    if (t.number === 6 || t.number === 8) reds.push(t.coord);
  }
  if (reds.length < 2) return 100;
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < reds.length; i++) {
    for (let j = i + 1; j < reds.length; j++) {
      const d = hexDist(reds[i], reds[j]);
      if (d < 2) return 0; // adjacent reds → max penalty (should be caught by constraint)
      totalDist += d;
      pairs++;
    }
  }
  const avgDist = totalDist / pairs;
  // Ideal: reds are spread across opposite sides of the board (avg dist 3-4+).
  // Map 2→20, 3→55, 4→90, 5+→100
  return Math.max(0, Math.min(100, (avgDist - 2) * 35 + 20));
}

function scoreDesertPlacement(tiles: Tile[], coordList: HexCoord[]): number {
  const deserts: HexCoord[] = tiles.filter(t => t.resource === R.DESERT).map(t => t.coord);
  void coordList; // kept in signature for API compatibility
  if (deserts.length === 0) return 100;
  const avgDist = deserts.reduce((s, h) => s + hexDist(h, { q: 0, r: 0 }), 0) / deserts.length;
  return Math.max(0, Math.min(100, (avgDist / 3) * 100));
}

function computeCIBI(
  tiles: Tile[], coordList: HexCoord[], coordIndex: Record<string, number>
): CIBIScore {
  const s1 = scorePipBalance(tiles);
  const s2 = scoreIntersectionQuality(tiles, coordList, coordIndex);
  const s3 = scoreResourceClustering(tiles);
  const s4 = scoreRedNumberSpread(tiles);
  const s5 = scoreDesertPlacement(tiles, coordList);
  // Weights: pip balance 25%, intersection 30%, resource spread 25%, red spread 15%, desert 5%
  const total = s1 * 0.25 + s2 * 0.30 + s3 * 0.25 + s4 * 0.15 + s5 * 0.05;
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
  const MAX_ATTEMPTS = 4000;
  let bestBoard: Board | null = null;
  let bestScore = -1;
  let attempts = 0;

  // ── Pass 1: all constraints (resource + reds + same-number) ─────────
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts++;
    const resources = shuffle(tilePool);
    const tilesSoFar: Tile[] = resources.map((res, i) => ({
      resource: res as Tile['resource'],
      number: null,
      coord: coordList[i],
    }));
    if (!checkNoAdjacentSameResource(tilesSoFar, coordIndex)) continue;
    // assignNumbersBalanced internally retries positions to satisfy same-number constraint
    assignNumbersBalanced(tilesSoFar, mode, coordIndex);
    if (!checkNoAdjacentReds(tilesSoFar, coordIndex)) continue;
    if (!checkNoAdjacentSameNumber(tilesSoFar, coordIndex)) continue;
    const cibi = computeCIBI(tilesSoFar, coordList, coordIndex);
    if (cibi.total > bestScore) {
      bestScore = cibi.total;
      bestBoard = { tiles: tilesSoFar.map(t => ({ ...t })), coordList, coordIndex, cibi, attempts };
    }
  }

  // ── Pass 2 (if pass 1 found nothing): relax same-number constraint ──
  if (!bestBoard) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      attempts++;
      const resources = shuffle(tilePool);
      const tilesSoFar: Tile[] = resources.map((res, i) => ({
        resource: res as Tile['resource'],
        number: null,
        coord: coordList[i],
      }));
      if (!checkNoAdjacentSameResource(tilesSoFar, coordIndex)) continue;
      assignNumbersBalanced(tilesSoFar, mode, coordIndex);
      if (!checkNoAdjacentReds(tilesSoFar, coordIndex)) continue;
      const cibi = computeCIBI(tilesSoFar, coordList, coordIndex);
      if (cibi.total > bestScore) {
        bestScore = cibi.total;
        bestBoard = { tiles: tilesSoFar.map(t => ({ ...t })), coordList, coordIndex, cibi, attempts };
      }
    }
  }

  // ── Pass 3 (last resort): only resource constraint ───────────────────
  if (!bestBoard) {
    for (let attempt = 0; attempt < 2000; attempt++) {
      attempts++;
      const resources = shuffle(tilePool);
      const tilesSoFar: Tile[] = resources.map((res, i) => ({
        resource: res as Tile['resource'],
        number: null,
        coord: coordList[i],
      }));
      if (!checkNoAdjacentSameResource(tilesSoFar, coordIndex)) continue;
      assignNumbersBalanced(tilesSoFar, mode);
      const cibi = computeCIBI(tilesSoFar, coordList, coordIndex);
      bestBoard = { tiles: tilesSoFar.map(t => ({ ...t })), coordList, coordIndex, cibi, attempts };
      break; // take the first resource-valid board
    }
  }

  // Always generate the surrounding water ring and place ports on it.
  // (For Standard mode the ring is implicit in the physical game; we render it
  //  so harbours are always visible regardless of expansion.)
  const waterHexes = waterCoords(coordList);
  const landSet = new Set(coordList.map((h) => `${h.q},${h.r}`));
  const portCandidates = waterHexes.filter((w) =>
    hexNeighbors(w).some((n) => landSet.has(`${n.q},${n.r}`))
  );
  const portList = shuffle([...PORTS[mode]]);
  const ports: Port[] = [];
  const usedWater = new Set<string>();
  for (let p = 0; p < portList.length; p++) {
    if (portCandidates.length === 0) break;
    let placed = false;
    // Try to find a water hex that isn't too close to another port
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
    // Fallback: cycle through candidates, skip already-used ones
    if (!placed) {
      for (const wh of portCandidates) {
        const wk = `${wh.q},${wh.r}`;
        if (usedWater.has(wk)) continue;
        usedWater.add(wk);
        ports.push({ ...portList[p], coord: wh } as Port);
        break;
      }
    }
  }
  if (bestBoard) {
    bestBoard.waterHexes = waterHexes;
    bestBoard.ports = ports;
  }

  // bestBoard is guaranteed non-null: pass 3 always produces at least one board
  if (!bestBoard) throw new Error('Board generation failed after all passes');
  return bestBoard;
}
