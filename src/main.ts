import '@fontsource-variable/geist';
import './styles.css';
import fontUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import { decodeCode, encodeCode, generate, type Board } from './lib/board';
import { MODES, RESOURCES, type Mode } from './lib/components';
import { BUDGET } from './lib/optimise';
import { violations } from './lib/rules';
import { boardRows, boardSvg, TERRAIN_NAME, TILE_COLOURS } from './ui/board-svg';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const els = {
  code: $('code'),
  finding: $('finding'),
  controls: $<HTMLFormElement>('controls'),
  board: $('board'),
  rows: $('rows'),
  method: $('method'),
  compare: $('compare'),
  production: $('production'),
  spots: $('spots'),
  picks: $('picks'),
  checks: $('checks'),
  status: $('status'),
};

let current: Board | null = null;

function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function selectedMode(): Mode {
  const v = new FormData(els.controls).get('mode');
  return v === '6' ? '6' : '4';
}

function show(board: Board, push: boolean) {
  current = board;
  const code = encodeCode(board.mode, board.seed);
  const url = new URL(location.href);
  url.searchParams.set('b', code);
  if (push) history.pushState({ code }, '', url);
  else history.replaceState({ code }, '', url);

  const radio = els.controls.querySelector<HTMLInputElement>(`input[value="${board.mode}"]`);
  if (radio) radio.checked = true;

  document.title = `Board ${code} · Fair Catan board`;
  els.code.textContent = code;
  els.board.innerHTML = boardSvg(board);
  els.rows.innerHTML = boardRows(board).map((r) => `<li>${r}</li>`).join('');
  renderBalance(board);
}

function renderBalance(b: Board) {
  const m = b.metrics, s = b.start.metrics;
  const spec = MODES[b.mode];
  const picks = m.draftValues.length;
  const lo = Math.min(...m.production), hi = Math.max(...m.production);

  els.finding.textContent =
    `Every resource pays ${lo === hi ? lo : `${lo}–${hi}`} of 36 rolls. ` +
    `The first and the ${ordinal(picks)} starting pick are ${plural(m.startSpread, 'pip')} apart.`;

  els.method.textContent =
    `This board started as a random layout that already obeyed the three rules below. ` +
    `Then ${BUDGET[b.mode].toLocaleString('en-GB')} swaps of tiles and numbers were tried, ` +
    `and a swap was kept only if every rule still held and the board did not get much less fair. ` +
    `The fairest board seen is the one shown.`;

  const row = (label: string, before: number, after: number) =>
    `<tr><th scope="row">${label}</th><td class="num muted">${before}</td><td class="num">${after}</td></tr>`;
  els.compare.innerHTML =
    row('Gap between most and least produced resource, pips', s.productionSpread, m.productionSpread) +
    row(`Gap between first and ${ordinal(picks)} starting pick`, s.startSpread, m.startSpread) +
    row('Touching pairs of high numbers (5, 6, 8, 9)', s.hotPairs, m.hotPairs) +
    row('Same-resource tiles two apart (shown, not scored)', s.sameResourceNear, m.sameResourceNear);

  const maxProd = Math.max(...m.production);
  els.production.innerHTML = RESOURCES.map((r, i) => {
    const tiles = spec.terrainCounts[i];
    const width = Math.round((m.production[i] / maxProd) * 100);
    return `<li>
      <span class="swatch" style="background:${TILE_COLOURS[r]}"></span>
      <span class="res">${TERRAIN_NAME[r]}<span class="muted"> · ${tiles} tiles</span></span>
      <span class="num value">${m.production[i]}<span class="muted"> /36</span></span>
      <span class="meter"><span style="width:${width}%"></span></span>
    </li>`;
  }).join('');

  els.spots.textContent =
    `If each player in turn takes the best free corner (no two settlements next to each other), ` +
    `the first pick is worth ${m.draftValues[0]} and the ${ordinal(picks)} is worth ${m.draftValues[picks - 1]}. ` +
    `A spot’s value is the pips of its tiles plus one per different resource.`;
  els.picks.innerHTML = m.draftValues.map((v) => `<li class="num">${v}</li>`).join('');

  const broken = new Set(violations(b.mode, b.layout).map((v) => v.kind));
  const check = (ok: boolean, text: string) =>
    `<li class="${ok ? 'ok' : 'bad'}"><span class="mark-${ok ? 'ok' : 'bad'}">${ok ? 'Holds' : 'Broken'}</span>${text}</li>`;
  els.checks.innerHTML =
    check(!broken.has('same-resource'), 'No two touching tiles have the same resource') +
    check(!broken.has('red-touch'), 'No 6 or 8 touches another 6 or 8') +
    check(!broken.has('same-number'), 'No two touching tiles have the same number') +
    check(!broken.has('wrong-counts'), `Official pieces: ${spec.terrainCounts.reduce((a, c) => a + c, 0)} tiles, ${spec.tokens.length} numbers, ${spec.ports.length} harbours`);
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function say(text: string) {
  els.status.textContent = text;
}

// ---------- actions ----------

els.controls.addEventListener('submit', (e) => {
  e.preventDefault();
  show(generate(selectedMode(), newSeed()), true);
  say('');
});
els.controls.addEventListener('change', () => {
  if (current && selectedMode() !== current.mode) show(generate(selectedMode(), newSeed()), true);
});

$('share').addEventListener('click', async () => {
  if (!current) return;
  const url = location.href;
  const title = `Catan board ${encodeCode(current.mode, current.seed)}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    say('Link copied.');
  } catch {
    say(`Copy this link: ${url}`);
  }
});

$('print').addEventListener('click', () => window.print());

$('save').addEventListener('click', async () => {
  if (!current) return;
  say('Preparing the image…');
  try {
    const code = encodeCode(current.mode, current.seed);
    const fontCss = await inlineFont();
    const svg = boardSvg(current, { caption: `Board ${code} · ${location.host}`, fontCss });
    const png = await svgToPng(svg, 2000);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = `catan-board-${code}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    say('Image saved.');
  } catch {
    say('The image could not be made in this browser. Use Print instead.');
  }
});

async function inlineFont(): Promise<string> {
  try {
    const buf = await (await fetch(fontUrl)).arrayBuffer();
    let bin = '';
    new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
    return `@font-face{font-family:"Geist Variable";font-weight:100 900;src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2")}`;
  } catch {
    return '';
  }
}

function svgToPng(svg: string, width: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = width / img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png');
    };
    img.onerror = reject;
    const sized = svg.replace('<svg ', `<svg width="${width}" `);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  });
}

// ---------- start ----------

function fromUrl(): Board | null {
  const code = new URL(location.href).searchParams.get('b');
  const parsed = code ? decodeCode(code) : null;
  return parsed ? generate(parsed.mode, parsed.seed) : null;
}

window.addEventListener('popstate', () => {
  const b = fromUrl();
  if (b) show(b, false);
});

const initial = fromUrl();
if (!initial && new URL(location.href).searchParams.has('b')) say('That board code was not recognised, so here is a new board.');
show(initial ?? generate('4', newSeed()), false);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
