import { describe, expect, it } from 'vitest';
import { decodeCode, encodeCode, generate } from '../../src/lib/board';
import { boardSvg } from '../../src/ui/board-svg';
import { MODES } from '../../src/lib/components';
import { geometry, hexCentre } from '../../src/lib/geometry';

describe('board codes', () => {
  it('round-trip every mode and edge seed', () => {
    for (const mode of ['4', '6'] as const) {
      for (const seed of [0, 1, 31, 32, 123456789, 0xffffffff]) {
        const code = encodeCode(mode, seed);
        expect(code).toMatch(/^[46]-[0-9A-HJKMNP-TV-Z]{7}$/);
        expect(decodeCode(code)).toEqual({ mode, seed });
        expect(decodeCode(code.toLowerCase().replace('-', ''))).toEqual({ mode, seed });
      }
    }
  });

  it('rejects malformed codes', () => {
    for (const bad of ['', '5-0000000', '4-000000', '4-00000000', '4-UUUUUUU', '4-ZZZZZZZ', 'hello']) {
      expect(decodeCode(bad)).toBeNull();
    }
  });
});

describe('determinism', () => {
  it('same seed, same board; different seed, different board', () => {
    for (const mode of ['4', '6'] as const) {
      expect(generate(mode, 77)).toEqual(generate(mode, 77));
      expect(generate(mode, 77).layout).not.toEqual(generate(mode, 78).layout);
    }
  });

  it('keeps known boards fixed, so old shared links keep working', () => {
    const fingerprint = (mode: '4' | '6', seed: number) => {
      const { terrain, token } = generate(mode, seed).layout;
      return terrain.map((t, i) => `${t}${token[i]}`).join(' ');
    };
    expect({
      a: fingerprint('4', 1),
      b: fingerprint('4', 0xdeadbeef),
      c: fingerprint('6', 1),
      d: fingerprint('6', 0xdeadbeef),
    }).toMatchSnapshot();
  });
});

describe('svg', () => {
  it.each(['4', '6'] as const)('draws every tile, token and harbour, and no start-spot markers (%s)', (mode) => {
    const b = generate(mode, 3);
    const svg = boardSvg(b);
    const spec = MODES[mode];
    expect(svg.match(/class="t-[a-z]+ tile"/g)!.length).toBe(spec.terrainCounts.reduce((a, c) => a + c, 0));
    expect(svg.match(/class="token-n/g)!.length).toBe(spec.tokens.length);
    expect(svg.match(/class="token-n red"/g)!.length).toBe(spec.tokens.filter((t) => t === 6 || t === 8).length);
    expect(svg.match(/class="port"/g)!.length).toBe(spec.ports.length);
    expect(svg).not.toContain('spot-');
  });
});

describe('4-player harbours match the printed frame', () => {
  // Reference: the user's frame image, flat-top, clockwise from the top.
  const expected = ['2:1 Ore', '3:1', '2:1 Brick', '3:1', '2:1 Grain', '2:1 Wool', '3:1', '2:1 Wood', '3:1'];

  it('draws each harbour at its spot, clockwise from the top, on every board', () => {
    for (const seed of [1, 2, 3, 999, 0xdeadbeef]) {
      const svg = boardSvg(generate('4', seed));
      const ports = [...svg.matchAll(/<g class="port" transform="translate\(([-\d.]+),([-\d.]+)\)">(.*?)<\/g>/g)].map((m) => ({
        x: Number(m[1]),
        y: Number(m[2]),
        label: [...m[3].matchAll(/>([^<]+)<\/text>/g)].map((t) => t[1]).join(' '),
      }));
      expect(ports.map((p) => p.label)).toEqual(expected);
      // Angle around the board centre, measured clockwise from straight up.
      const angle = (p: { x: number; y: number }) => ((Math.atan2(p.x, -p.y) * 180) / Math.PI + 360) % 360;
      const angles = ports.map(angle);
      expect(angles[0] < 5 || angles[0] > 355).toBe(true); // ore sits straight above the top hills
      for (let i = 2; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
      // Same spots on every board: only tiles and numbers change.
      expect(ports.map((p) => `${p.x},${p.y}`)).toEqual(
        [...boardSvg(generate('4', 1)).matchAll(/<g class="port" transform="translate\(([-\d.]+),([-\d.]+)\)">/g)].map((m) => `${m[1]},${m[2]}`),
      );
    }
  });

  it('serves the exact tile edge in the reference', () => {
    const geo = geometry('4');
    const at = (q: number, r: number) => geo.hexes.findIndex((h) => h.q === q && h.r === r);
    // [land hex, sea neighbour] per harbour, read off the reference image.
    const edges: [[number, number], [number, number]][] = [
      [[0, -2], [0, -3]], [[1, -2], [2, -3]], [[2, -1], [3, -2]], [[2, 0], [3, 0]], [[1, 1], [1, 2]],
      [[-1, 2], [-1, 3]], [[-2, 2], [-3, 3]], [[-2, 1], [-3, 1]], [[-1, -1], [-2, -1]],
    ];
    geo.ports.forEach((port, i) => {
      const [[q, r], [sq, sr]] = edges[i];
      expect(port.hex).toBe(at(q, r));
      // Both vertices are corners of the land hex and of the sea hex across the harbour edge.
      const [cx, cy] = hexCentre({ q: sq, r: sr });
      const seaCorners = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]].map(([dx, dy]) => `${cx + dx},${cy + dy}`);
      for (const v of port.vertices) {
        expect(geo.vertexHexes[v]).toContain(at(q, r));
        expect(seaCorners).toContain(geo.vertexXY[v].join(','));
      }
    });
  });
});

describe('5–6 player harbours match the printed frame', () => {
  const ports = () =>
    [...boardSvg(generate('6', 1)).matchAll(/<g class="port" transform="translate\(([-\d.]+),([-\d.]+)\)">(.*?)<\/g>/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
      label: [...m[3].matchAll(/>([^<]+)<\/text>/g)].map((t) => t[1]).join(' '),
    }));

  it('has the reference types, clockwise from the top left', () => {
    expect(ports().map((p) => p.label)).toEqual(
      ['3:1', '2:1 Wool', '3:1', '3:1', '2:1 Brick', '2:1 Wool', '2:1 Wood', '3:1', '2:1 Grain', '3:1', '2:1 Ore'],
    );
    const list = ports();
    const angles = list.map((p) => (Math.atan2(p.x, -p.y) * 180) / Math.PI);
    // Starts upper left (negative angle), then runs clockwise.
    const turned = angles.map((a) => (a - angles[0] + 360) % 360);
    for (let i = 1; i < turned.length; i++) expect(turned[i]).toBeGreaterThan(turned[i - 1]);
  });

  it('sits on coast edges 0, 3, 7, 12, 15, 18, 21, 24, 27, 30, 33 counted clockwise from the top-left hex', () => {
    const geo = geometry('6');
    const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
    // Clockwise coast, re-based to the upper-left edge of the first hex of the top row.
    const first = geo.coast.findIndex(([a, b]) => key(a, b) === key(...geo.ports[0].vertices));
    const order = [...geo.coast.slice(first), ...geo.coast.slice(0, first)].map(([a, b]) => key(a, b));
    expect(order.length).toBe(38);
    expect(geo.ports.map((p) => order.indexOf(key(...p.vertices)))).toEqual([0, 3, 7, 12, 15, 18, 21, 24, 27, 30, 33]);
    expect(geo.hexes[geo.ports[0].hex]).toEqual({ q: 0, r: -3 });
  });
});
