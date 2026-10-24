import { describe, expect, it } from 'vitest';
import { MODES } from '../../src/lib/components';
import { geometry } from '../../src/lib/geometry';

describe.each([
  ['4', 19, 54, 72, 30, 9],
  ['6', 30, 80, 109, 38, 11],
] as const)('geometry %s', (mode, hexes, vertices, edges, coast, ports) => {
  const geo = geometry(mode);

  it('has the official hex count and the graph sizes that follow', () => {
    expect(geo.hexes.length).toBe(hexes);
    expect(geo.vertexXY.length).toBe(vertices);
    const edgeCount = geo.vertexNeighbours.reduce((a, n) => a + n.length, 0) / 2;
    expect(edgeCount).toBe(edges);
    expect(geo.coast.length).toBe(coast);
  });

  it('has symmetric hex adjacency and a connected board', () => {
    geo.neighbours.forEach((ns, a) => ns.forEach((b) => expect(geo.neighbours[b]).toContain(a)));
    const n = geo.hexes.length;
    for (let i = 0; i < n * n; i++) expect(geo.dist[i]).toBeGreaterThanOrEqual(0);
  });

  it('every vertex touches 1 to 3 hexes', () => {
    for (const hs of geo.vertexHexes) {
      expect(hs.length).toBeGreaterThanOrEqual(1);
      expect(hs.length).toBeLessThanOrEqual(3);
    }
  });

  it('coast is one closed cycle', () => {
    geo.coast.forEach(([, b], i) => expect(geo.coast[(i + 1) % geo.coast.length][0]).toBe(b));
  });

  it(`has ${ports} harbours on the coast with the official types, none sharing a vertex`, () => {
    expect(geo.ports.length).toBe(ports);
    expect(geo.ports.map((p) => p.resource)).toEqual(MODES[mode].ports.map((p) => p.resource));
    const coastVertices = new Set(geo.coast.flat());
    const used = new Set<number>();
    for (const p of geo.ports) {
      for (const v of p.vertices) {
        expect(coastVertices.has(v)).toBe(true);
        expect(used.has(v)).toBe(false);
        used.add(v);
        expect(geo.vertexHexes[v]).toContain(p.hex);
      }
    }
    const generic = geo.ports.filter((p) => p.resource === null).length;
    expect(generic).toBe(mode === '4' ? 4 : 5);
  });
});
