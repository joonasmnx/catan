import type { HexCoord } from './types';

export const HEX_DIRS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export function hexDist(a: HexCoord, b: HexCoord): number {
  return (
    Math.abs(a.q - b.q) +
    Math.abs(a.q + a.r - b.q - b.r) +
    Math.abs(a.r - b.r)
  ) / 2;
}

export function hexNeighbors(h: HexCoord): HexCoord[] {
  return HEX_DIRS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}

function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [{ ...center }];
  const results: HexCoord[] = [];
  let h: HexCoord = {
    q: center.q + HEX_DIRS[4].q * radius,
    r: center.r + HEX_DIRS[4].r * radius,
  };
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push({ ...h });
      h = { q: h.q + HEX_DIRS[i].q, r: h.r + HEX_DIRS[i].r };
    }
  }
  return results;
}

export function hexDisk(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let r = 0; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}

export function landCoords4p(): HexCoord[] {
  return hexDisk({ q: 0, r: 0 }, 2);
}

export function landCoords56p(): HexCoord[] {
  const disk = hexDisk({ q: 0, r: 0 }, 3);
  const isCorner = (h: HexCoord) => {
    const s = -h.q - h.r;
    const cnt = [Math.abs(h.q), Math.abs(h.r), Math.abs(s)].filter((v) => v === 3).length;
    return cnt >= 2;
  };
  return disk.filter((h) => !isCorner(h));
}

export function waterCoords(landHexes: HexCoord[]): HexCoord[] {
  const landSet = new Set(landHexes.map((h) => `${h.q},${h.r}`));
  const maxDist = Math.max(...landHexes.map((h) => hexDist(h, { q: 0, r: 0 })));
  const candidates = hexDisk({ q: 0, r: 0 }, maxDist + 2);
  return candidates.filter((h) => {
    if (landSet.has(`${h.q},${h.r}`)) return false;
    return hexNeighbors(h).some((n) => landSet.has(`${n.q},${n.r}`));
  });
}

export function trimIsland(center: HexCoord, count: number): HexCoord[] {
  const disk = hexDisk(center, 4);
  return disk
    .sort((a, b) => hexDist(a, center) - hexDist(b, center))
    .slice(0, count);
}

export function landCoordsArchipelago4p(): HexCoord[] {
  return [
    ...trimIsland({ q: -4, r: 1 }, 7),
    ...trimIsland({ q: 3, r: -4 }, 7),
    ...trimIsland({ q: 1, r: 3 }, 5),
  ];
}

export function landCoordsArchipelago56p(): HexCoord[] {
  return [
    ...trimIsland({ q: -5, r: 1 }, 10),
    ...trimIsland({ q: 4, r: -6 }, 10),
    ...trimIsland({ q: 1, r: 5 }, 10),
  ];
}

export function landCoordsTwinIslands4p(): HexCoord[] {
  return [
    ...trimIsland({ q: -4, r: 0 }, 10),
    ...trimIsland({ q: 4, r: -3 }, 9),
  ];
}

export function landCoordsTwinIslands56p(): HexCoord[] {
  return [
    ...trimIsland({ q: -5, r: 1 }, 15),
    ...trimIsland({ q: 5, r: -5 }, 15),
  ];
}

export function getLandCoords(mode: string, layout: string): HexCoord[] {
  const is56 = mode.includes('56');
  if (layout === 'archipelago') return is56 ? landCoordsArchipelago56p() : landCoordsArchipelago4p();
  if (layout === 'twin') return is56 ? landCoordsTwinIslands56p() : landCoordsTwinIslands4p();
  return is56 ? landCoords56p() : landCoords4p();
}

export function axialToPixel(
  q: number,
  r: number,
  size: number,
  origin: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: origin.x + size * (3 / 2) * q,
    y: origin.y + size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

export function hexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    corners.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return corners;
}
