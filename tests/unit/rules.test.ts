import { describe, expect, it } from 'vitest';
import { DESERT } from '../../src/lib/components';
import { generate } from '../../src/lib/board';
import { geometry } from '../../src/lib/geometry';
import { violations, type Layout } from '../../src/lib/rules';

const clone = (l: Layout): Layout => ({ terrain: [...l.terrain], token: [...l.token] });

describe('hard rules', () => {
  const board = generate('4', 11);
  const geo = geometry('4');

  it('a generated board has no violations', () => {
    expect(violations('4', board.layout)).toEqual([]);
  });

  it('catches two touching hexes with the same resource', () => {
    const l = clone(board.layout);
    const [a, b] = geo.hexEdges.find(([x, y]) => l.terrain[x] !== DESERT && l.terrain[y] !== DESERT)!;
    // Swap b's terrain with some hex holding a's resource elsewhere, keeping counts.
    const other = l.terrain.findIndex((t, h) => h !== a && t === l.terrain[a]);
    [l.terrain[b], l.terrain[other]] = [l.terrain[other], l.terrain[b]];
    expect(violations('4', l).some((v) => v.kind === 'same-resource')).toBe(true);
  });

  it('catches touching 6 and 8, and touching equal numbers', () => {
    const l = clone(board.layout);
    const six = l.token.indexOf(6);
    const nb = geo.neighbours[six].find((h) => l.terrain[h] !== DESERT)!;
    const eight = l.token.indexOf(8);
    [l.token[nb], l.token[eight]] = [l.token[eight], l.token[nb]];
    expect(violations('4', l).some((v) => v.kind === 'red-touch')).toBe(true);

    const m = clone(board.layout);
    const sixes = m.token.map((t, h) => (t === 6 ? h : -1)).filter((h) => h >= 0);
    const nb2 = geo.neighbours[sixes[0]].find((h) => m.terrain[h] !== DESERT)!;
    [m.token[nb2], m.token[sixes[1]]] = [m.token[sixes[1]], m.token[nb2]];
    expect(violations('4', m).some((v) => v.kind === 'same-number' || v.kind === 'red-touch')).toBe(true);
  });

  it('catches a token on the desert and wrong counts', () => {
    const l = clone(board.layout);
    const d = l.terrain.indexOf(DESERT);
    l.token[d] = 4;
    const kinds = violations('4', l).map((v) => v.kind);
    expect(kinds).toContain('token-on-desert');
    expect(kinds).toContain('wrong-counts');
  });
});
