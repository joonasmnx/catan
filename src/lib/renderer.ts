import type { Board, HexCoord, Port, Resource, Tile } from './types';
import { axialToPixel, hexCorners, hexDist } from './hexGrid';
import { PIPS, RESOURCE_COLORS } from './types';

interface RenderParams {
  hexSize: number;
  origin: { x: number; y: number };
}

function computeRenderParams(
  hexes: HexCoord[],
  canvasW: number,
  canvasH: number,
  padding: number = 28
): RenderParams {
  // Try unit size=1 to find bounding box
  const pts = hexes.map((h) => axialToPixel(h.q, h.r, 1, { x: 0, y: 0 }));
  const minX = Math.min(...pts.map((p) => p.x)) - 1;
  const maxX = Math.max(...pts.map((p) => p.x)) + 1;
  const minY = Math.min(...pts.map((p) => p.y)) - Math.sqrt(3) / 2;
  const maxY = Math.max(...pts.map((p) => p.y)) + Math.sqrt(3) / 2;
  const scaleX = (canvasW - padding * 2) / (maxX - minX);
  const scaleY = (canvasH - padding * 2) / (maxY - minY);
  const hexSize = Math.min(scaleX, scaleY);
  const ox = canvasW / 2 - ((minX + maxX) / 2) * hexSize;
  const oy = canvasH / 2 - ((minY + maxY) / 2) * hexSize;
  return { hexSize, origin: { x: ox, y: oy } };
}

function tracePath(ctx: CanvasRenderingContext2D, corners: { x: number; y: number }[]) {
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
}

/* ── Terrain illustration functions ────────────────────────────────── */

function drawForest(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  function pine(x: number, y: number, s: number, dark: boolean) {
    // Trunk
    ctx.beginPath();
    ctx.rect(x - s * 0.09, y + s * 0.28, s * 0.18, s * 0.35);
    ctx.fillStyle = dark ? 'rgba(55,30,10,0.9)' : 'rgba(80,45,15,0.85)';
    ctx.fill();

    // Three tiers of foliage — bottom to top
    const tiers = [
      { w: 0.72, h: 0.55, yOff: 0.38 },
      { w: 0.58, h: 0.50, yOff: 0.10 },
      { w: 0.44, h: 0.48, yOff: -0.16 },
    ];
    tiers.forEach(({ w, h, yOff }, i) => {
      const shade = dark
        ? `rgba(${15 + i * 8},${50 + i * 18},${15 + i * 8},${0.95 - i * 0.06})`
        : `rgba(${22 + i * 10},${68 + i * 20},${22 + i * 10},${0.92 - i * 0.06})`;
      ctx.beginPath();
      ctx.moveTo(x, y + yOff * s - h * s * 0.5);
      ctx.lineTo(x - w * s * 0.5, y + yOff * s + h * s * 0.5);
      ctx.lineTo(x + w * s * 0.5, y + yOff * s + h * s * 0.5);
      ctx.closePath();
      ctx.fillStyle = shade;
      ctx.fill();
      // Snow cap on topmost tier
      if (i === 2) {
        ctx.beginPath();
        ctx.moveTo(x, y + yOff * s - h * s * 0.5);
        ctx.lineTo(x - w * s * 0.15, y + yOff * s);
        ctx.lineTo(x + w * s * 0.15, y + yOff * s);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
      }
    });
  }

  const s = size * 0.30;
  pine(cx - size * 0.26, cy - size * 0.12, s, true);
  pine(cx + size * 0.26, cy - size * 0.12, s, true);
  pine(cx, cy + size * 0.14, s * 1.12, false);
  pine(cx - size * 0.44, cy + size * 0.06, s * 0.78, true);
  pine(cx + size * 0.42, cy + size * 0.04, s * 0.78, true);
}

function drawFields(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Draw wheat stalks in a scattered pattern
  const stalks = [
    { x: -0.30, y: -0.18 }, { x: -0.10, y: -0.28 }, { x:  0.14, y: -0.20 },
    { x:  0.30, y: -0.08 }, { x: -0.20, y:  0.08 }, { x:  0.04, y:  0.02 },
    { x:  0.22, y:  0.12 }, { x: -0.34, y:  0.18 }, { x:  0.10, y:  0.24 },
  ];
  for (const st of stalks) {
    const sx = cx + st.x * size;
    const sy = cy + st.y * size;
    const h = size * 0.22;
    // Stalk
    ctx.beginPath();
    ctx.moveTo(sx, sy + h * 0.5);
    ctx.lineTo(sx + size * 0.012, sy - h * 0.5);
    ctx.strokeStyle = 'rgba(130,85,5,0.7)';
    ctx.lineWidth = Math.max(1, size * 0.028);
    ctx.stroke();
    // Grain head (ellipse)
    ctx.beginPath();
    ctx.ellipse(sx + size * 0.015, sy - h * 0.62, size * 0.038, size * 0.11, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(195,148,8,0.85)';
    ctx.fill();
    // Grain highlight
    ctx.beginPath();
    ctx.ellipse(sx + size * 0.010, sy - h * 0.66, size * 0.018, size * 0.055, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230,190,60,0.5)';
    ctx.fill();
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Back peak (right)
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.22, cy - size * 0.20);
  ctx.lineTo(cx - size * 0.04, cy + size * 0.30);
  ctx.lineTo(cx + size * 0.52, cy + size * 0.30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(62,74,92,0.65)';
  ctx.fill();
  // Snow on back peak
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.22, cy - size * 0.20);
  ctx.lineTo(cx + size * 0.09, cy - size * 0.01);
  ctx.lineTo(cx + size * 0.35, cy - size * 0.01);
  ctx.closePath();
  ctx.fillStyle = 'rgba(230,238,248,0.85)';
  ctx.fill();

  // Front peak (left, taller)
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.10, cy - size * 0.40);
  ctx.lineTo(cx - size * 0.52, cy + size * 0.30);
  ctx.lineTo(cx + size * 0.22, cy + size * 0.30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(78,92,112,0.75)';
  ctx.fill();
  // Shaded left face
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.10, cy - size * 0.40);
  ctx.lineTo(cx - size * 0.52, cy + size * 0.30);
  ctx.lineTo(cx - size * 0.10, cy + size * 0.30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40,50,68,0.35)';
  ctx.fill();
  // Snow cap on front peak
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.10, cy - size * 0.40);
  ctx.lineTo(cx - size * 0.26, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.06, cy - size * 0.14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(235,242,252,0.92)';
  ctx.fill();
}

function drawPasture(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const flock = [
    { x: cx - size * 0.24, y: cy + size * 0.04 },
    { x: cx + size * 0.22, y: cy - size * 0.12 },
    { x: cx + size * 0.04, y: cy + size * 0.24 },
  ];
  for (const sh of flock) {
    const sc = size * 0.145;
    // Wool body (fluffy - multiple overlapping ellipses)
    const fluffs = [
      { dx: 0, dy: 0, rx: sc, ry: sc * 0.72 },
      { dx: sc * 0.55, dy: -sc * 0.12, rx: sc * 0.7, ry: sc * 0.56 },
      { dx: -sc * 0.52, dy: -sc * 0.10, rx: sc * 0.7, ry: sc * 0.55 },
    ];
    for (const f of fluffs) {
      ctx.beginPath();
      ctx.ellipse(sh.x + f.dx, sh.y + f.dy, f.rx, f.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,238,228,0.90)';
      ctx.fill();
    }
    // Face / head
    ctx.beginPath();
    ctx.arc(sh.x + sc * 0.98, sh.y - sc * 0.22, sc * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(48,36,28,0.85)';
    ctx.fill();
    // Eye
    ctx.beginPath();
    ctx.arc(sh.x + sc * 1.08, sh.y - sc * 0.30, sc * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    // Legs
    ctx.strokeStyle = 'rgba(55,44,34,0.7)';
    ctx.lineWidth = Math.max(1, size * 0.025);
    for (let l = 0; l < 4; l++) {
      const lx = sh.x - sc * 0.60 + l * sc * 0.42;
      ctx.beginPath();
      ctx.moveTo(lx, sh.y + sc * 0.55);
      ctx.lineTo(lx, sh.y + sc * 1.10);
      ctx.stroke();
    }
  }
}

function drawHills(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Rolling terracotta hills with brick texture hints
  const hills = [
    { x: cx - size * 0.20, y: cy + size * 0.32, r: size * 0.52, c1: 'rgba(140,48,16,0.55)', c2: 'rgba(168,58,22,0.45)' },
    { x: cx + size * 0.22, y: cy + size * 0.26, r: size * 0.44, c1: 'rgba(158,56,18,0.52)', c2: 'rgba(188,68,26,0.42)' },
    { x: cx,               y: cy + size * 0.08, r: size * 0.40, c1: 'rgba(175,64,22,0.50)', c2: 'rgba(200,76,30,0.40)' },
  ];
  for (const b of hills) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, Math.PI, 0);
    ctx.closePath();
    const grad = ctx.createRadialGradient(b.x - b.r * 0.2, b.y - b.r * 0.4, b.r * 0.05, b.x, b.y, b.r);
    grad.addColorStop(0, b.c2);
    grad.addColorStop(1, b.c1);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  // Horizontal brick-line stripes
  ctx.strokeStyle = 'rgba(90,28,8,0.28)';
  ctx.lineWidth = Math.max(0.8, size * 0.02);
  for (let i = 0; i < 3; i++) {
    const y = cy + size * (-0.05 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.38, y);
    ctx.lineTo(cx + size * 0.38, y);
    ctx.stroke();
  }
}

function drawDesert(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Sand ripples
  for (let i = 0; i < 4; i++) {
    const y = cy - size * 0.20 + i * size * 0.14;
    const w = size * (0.45 - i * 0.05);
    ctx.beginPath();
    ctx.ellipse(cx + size * (i % 2 === 0 ? 0.04 : -0.04), y, w, size * 0.045, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(160,130,40,0.32)';
    ctx.lineWidth = Math.max(0.8, size * 0.022);
    ctx.stroke();
  }
  // Cactus
  const cactusX = cx + size * 0.10;
  const cactusY = cy + size * 0.18;
  const cs = size * 0.11;
  // Main trunk
  ctx.beginPath();
  ctx.rect(cactusX - cs * 0.32, cactusY - cs * 2.0, cs * 0.64, cs * 2.2);
  ctx.fillStyle = 'rgba(42,95,42,0.75)';
  ctx.fill();
  // Left arm
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.10, cactusY - cs * 1.05, cs * 0.78, cs * 0.52);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.10, cactusY - cs * 1.55, cs * 0.52, cs * 0.55);
  ctx.fill();
  // Right arm
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.32, cactusY - cs * 0.85, cs * 0.78, cs * 0.52);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.60, cactusY - cs * 1.35, cs * 0.52, cs * 0.55);
  ctx.fill();
}

/* ── Number token ─────────────────────────────────────────────────── */

function drawNumberToken(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  number: number,
  hexSize: number
) {
  const isRed = number === 6 || number === 8;
  const r = Math.max(16, hexSize * 0.24);
  const pips = PIPS[number] || 0;

  // Outer shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.08, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Outer dark ring (wood-like border)
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = isRed ? '#5a1208' : '#3a2808';
  ctx.fill();

  // Inner ring (lighter)
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
  ctx.fillStyle = isRed ? '#7a2010' : '#5a3e10';
  ctx.fill();

  // Parchment face
  const faceGrad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, r * 0.05, cx, cy, r);
  faceGrad.addColorStop(0, '#f5e9c0');
  faceGrad.addColorStop(0.6, '#e8d190');
  faceGrad.addColorStop(1, '#d4b860');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Number text
  const fontSize = Math.round(r * 1.12);
  ctx.font = `bold ${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isRed ? '#cc1a05' : '#1a1005';
  // Slight text shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 2;
  ctx.fillText(String(number), cx, cy - r * 0.08);
  ctx.shadowBlur = 0;

  // Pip dots
  const pipR = Math.max(1.5, r * 0.092);
  const pipSpacing = pipR * 2.4;
  const pipY = cy + r * 0.46;
  const totalW = (pips - 1) * pipSpacing;
  for (let i = 0; i < pips; i++) {
    const px = cx - totalW / 2 + i * pipSpacing;
    ctx.beginPath();
    ctx.arc(px, pipY, pipR, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? '#cc1a05' : '#2a1a05';
    ctx.fill();
  }
}

/* ── Water hex ─────────────────────────────────────────────────────── */

function drawWaterHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  port?: Port
) {
  const col = RESOURCE_COLORS.water;
  const corners = hexCorners(cx, cy, size);

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();

  // Ocean gradient
  const grad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, size * 0.1, cx, cy, size * 1.0);
  grad.addColorStop(0, col.light);
  grad.addColorStop(0.5, col.mid);
  grad.addColorStop(1, col.base);
  ctx.fillStyle = grad;
  ctx.fill();

  // Wave lines
  ctx.save();
  const innerC = hexCorners(cx, cy, size * 0.85);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(innerC[i].x, innerC[i].y);
    else ctx.lineTo(innerC[i].x, innerC[i].y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,130,200,0.22)';
  ctx.lineWidth = Math.max(0.8, size * 0.028);
  for (let i = 0; i < 3; i++) {
    const wy = cy - size * 0.18 + i * size * 0.20;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.50, wy);
    ctx.bezierCurveTo(cx - size * 0.25, wy - size * 0.05, cx + size * 0.25, wy + size * 0.05, cx + size * 0.50, wy);
    ctx.stroke();
  }
  ctx.restore();

  // Border
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(10,30,70,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Port badge
  if (port) {
    const badgeR = size * 0.32;
    ctx.beginPath();
    ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,12,5,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#c4a050';
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();

    ctx.font = `bold ${Math.round(badgeR * 0.68)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0d080';
    ctx.fillText(port.type, cx, cy - badgeR * 0.12);
    if (port.resource) {
      const icons: Record<string, string> = {
        forest: '🌲', pasture: '🐑', fields: '🌾', mountains: '⛰', hills: '🧱',
      };
      ctx.font = `${Math.round(badgeR * 0.62)}px serif`;
      ctx.fillText(icons[port.resource] || '?', cx, cy + badgeR * 0.48);
    }
  }
}

/* ── Main hex drawing ─────────────────────────────────────────────── */

function drawLandHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  tile: Tile
) {
  const col = RESOURCE_COLORS[tile.resource] || RESOURCE_COLORS.water;
  const corners = hexCorners(cx, cy, size);

  // Drop shadow
  ctx.beginPath();
  const shadowC = hexCorners(cx + size * 0.04, cy + size * 0.055, size * 0.97);
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(shadowC[i].x, shadowC[i].y);
    else ctx.lineTo(shadowC[i].x, shadowC[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.fill();

  // Main fill — radial gradient from upper-left
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();

  const mainGrad = ctx.createRadialGradient(
    cx - size * 0.30, cy - size * 0.30, size * 0.04,
    cx + size * 0.10, cy + size * 0.10, size * 1.1
  );
  mainGrad.addColorStop(0, col.light);
  mainGrad.addColorStop(0.45, col.mid);
  mainGrad.addColorStop(1, col.base);
  ctx.fillStyle = mainGrad;
  ctx.fill();

  // Terrain illustration, clipped to inner hex
  ctx.save();
  const innerC = hexCorners(cx, cy, size * 0.83);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(innerC[i].x, innerC[i].y);
    else ctx.lineTo(innerC[i].x, innerC[i].y);
  }
  ctx.closePath();
  ctx.clip();

  switch (tile.resource) {
    case 'forest':    drawForest(ctx, cx, cy, size);    break;
    case 'fields':    drawFields(ctx, cx, cy, size);    break;
    case 'mountains': drawMountains(ctx, cx, cy, size); break;
    case 'pasture':   drawPasture(ctx, cx, cy, size);   break;
    case 'hills':     drawHills(ctx, cx, cy, size);     break;
    case 'desert':    drawDesert(ctx, cx, cy, size);    break;
  }
  ctx.restore();

  // Outer dark border
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,0.80)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner bevel (lighter ring just inside edge)
  ctx.beginPath();
  const bevelC = hexCorners(cx, cy, size * 0.88);
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(bevelC[i].x, bevelC[i].y);
    else ctx.lineTo(bevelC[i].x, bevelC[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Edge highlight (upper-left faces)
  ctx.beginPath();
  ctx.moveTo(corners[3].x, corners[3].y);
  ctx.lineTo(corners[4].x, corners[4].y);
  ctx.lineTo(corners[5].x, corners[5].y);
  ctx.lineTo(corners[0].x, corners[0].y);
  ctx.strokeStyle = 'rgba(255,255,255,0.26)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Edge shadow (lower-right faces)
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

/* ── Public render function ─────────────────────────────────────────── */

export function renderBoard(canvas: HTMLCanvasElement, board: Board) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bgGrad.addColorStop(0, '#0e1824');
  bgGrad.addColorStop(1, '#060c14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Collect all hexes for bounds computation
  const allHexes = [
    ...board.coordList,
    ...(board.waterHexes || []),
  ];
  const { hexSize, origin } = computeRenderParams(allHexes, W, H, 32);

  // Draw water first
  if (board.waterHexes) {
    const portMap = new Map<string, Port>();
    if (board.ports) {
      for (const p of board.ports) portMap.set(`${p.coord.q},${p.coord.r}`, p);
    }
    for (const wh of board.waterHexes) {
      const { x, y } = axialToPixel(wh.q, wh.r, hexSize, origin);
      const port = portMap.get(`${wh.q},${wh.r}`);
      drawWaterHex(ctx, x, y, hexSize, port);
    }
  }

  // Draw land tiles
  for (const tile of board.tiles) {
    const { x, y } = axialToPixel(tile.coord.q, tile.coord.r, hexSize, origin);
    drawLandHex(ctx, x, y, hexSize, tile);
  }

  // Draw number tokens on top
  for (const tile of board.tiles) {
    if (!tile.number) continue;
    const { x, y } = axialToPixel(tile.coord.q, tile.coord.r, hexSize, origin);
    drawNumberToken(ctx, x, y, tile.number, hexSize);
  }
}
