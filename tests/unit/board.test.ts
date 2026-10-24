import { describe, expect, it } from 'vitest';
import { decodeCode, encodeCode, generate } from '../../src/lib/board';
import { boardSvg } from '../../src/ui/board-svg';
import { MODES } from '../../src/lib/components';

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
  it.each(['4', '6'] as const)('draws every tile, token, harbour and both start spots (%s)', (mode) => {
    const b = generate(mode, 3);
    const svg = boardSvg(b);
    const spec = MODES[mode];
    expect(svg.match(/class="t-[a-z]+ tile"/g)!.length).toBe(spec.terrainCounts.reduce((a, c) => a + c, 0));
    expect(svg.match(/class="token-n/g)!.length).toBe(spec.tokens.length);
    expect(svg.match(/class="token-n red"/g)!.length).toBe(spec.tokens.filter((t) => t === 6 || t === 8).length);
    expect(svg.match(/class="port"/g)!.length).toBe(spec.ports.length);
    expect(svg).toContain('spot-best');
    expect(svg).toContain('spot-worst');
  });
});
