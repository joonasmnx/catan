import type { Board, HexCoord, Port, Resource, Tile } from './types';
import { axialToPixel, hexCorners } from './hexGrid';
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

/* ── Terrain illustration functions ────────────────────────────────── */

function drawForest(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Subtle floor tint only — no heavy dark overlay
  const groundGrad = ctx.createLinearGradient(cx, cy - size * 0.3, cx, cy + size);
  groundGrad.addColorStop(0, 'rgba(8,22,8,0.0)');
  groundGrad.addColorStop(1, 'rgba(5,15,5,0.35)');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 2);

  function pine(x: number, y: number, s: number, tiers = 4) {
    // Trunk
    const trunkW = s * 0.14;
    ctx.beginPath();
    ctx.rect(x - trunkW * 0.5, y + s * 0.18, trunkW, s * 0.44);
    ctx.fillStyle = '#4a2e10';
    ctx.fill();

    // Foliage tiers — bright vivid greens
    const tierDefs = [
      { w: 0.86, h: 0.64, yOff: 0.30 },
      { w: 0.68, h: 0.58, yOff: 0.04 },
      { w: 0.52, h: 0.53, yOff: -0.20 },
      { w: 0.36, h: 0.46, yOff: -0.41 },
    ].slice(0, tiers);

    // Dark (left) and light (right) — deep emerald, clearly different from pasture lime
    const darkGreens =  ['#0d5228', '#10602e', '#137035', '#178040'];
    const lightGreens = ['#1a8040', '#22984c', '#2ab058', '#32c868'];

    for (let i = 0; i < tierDefs.length; i++) {
      const { w, h, yOff } = tierDefs[i];

      // Shadow (left) face
      ctx.beginPath();
      ctx.moveTo(x, y + yOff * s - h * s * 0.5);
      ctx.lineTo(x - w * s * 0.5, y + yOff * s + h * s * 0.5);
      ctx.lineTo(x, y + yOff * s + h * s * 0.28);
      ctx.closePath();
      ctx.fillStyle = darkGreens[i] || darkGreens[darkGreens.length - 1];
      ctx.fill();

      // Light (right) face
      ctx.beginPath();
      ctx.moveTo(x, y + yOff * s - h * s * 0.5);
      ctx.lineTo(x, y + yOff * s + h * s * 0.28);
      ctx.lineTo(x + w * s * 0.5, y + yOff * s + h * s * 0.5);
      ctx.closePath();
      ctx.fillStyle = lightGreens[i] || lightGreens[lightGreens.length - 1];
      ctx.fill();

      // Snow tip on topmost tier — bright and visible
      if (i === tiers - 1) {
        ctx.beginPath();
        ctx.moveTo(x, y + yOff * s - h * s * 0.5);
        ctx.lineTo(x - w * s * 0.12, y + yOff * s - h * s * 0.13);
        ctx.lineTo(x + w * s * 0.12, y + yOff * s - h * s * 0.09);
        ctx.closePath();
        ctx.fillStyle = 'rgba(235,248,235,0.82)';
        ctx.fill();
      }
    }
  }

  // Back row
  pine(cx - size * 0.38, cy - size * 0.22, size * 0.27, 3);
  pine(cx + size * 0.16, cy - size * 0.28, size * 0.25, 3);
  pine(cx + size * 0.38, cy - size * 0.20, size * 0.26, 3);
  // Middle row
  pine(cx - size * 0.22, cy - size * 0.08, size * 0.33, 4);
  pine(cx + size * 0.26, cy - size * 0.06, size * 0.32, 4);
  // Front — large, prominent
  pine(cx - size * 0.44, cy + size * 0.04, size * 0.28, 3);
  pine(cx - size * 0.02, cy + size * 0.10, size * 0.40, 4);
  pine(cx + size * 0.46, cy + size * 0.02, size * 0.28, 3);
}

function drawFields(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Draw 5 bold wheat sheaves filling the hex
  const sheaves = [
    { x: -0.28, y: 0.14 },
    { x:  0.00, y: 0.00 },
    { x:  0.28, y: 0.14 },
    { x: -0.14, y: -0.24 },
    { x:  0.14, y: -0.24 },
  ];

  for (const pos of sheaves) {
    const bx = cx + pos.x * size;
    const by = cy + pos.y * size;
    const h = size * 0.48;

    // 5 stalks per sheaf — spread slightly
    for (let i = -2; i <= 2; i++) {
      const sx = bx + i * size * 0.042;
      const lean = i * 0.022;

      // Stalk
      ctx.beginPath();
      ctx.moveTo(sx, by + h * 0.46);
      ctx.lineTo(sx + lean * size, by - h * 0.28);
      ctx.strokeStyle = '#7a5810';
      ctx.lineWidth = Math.max(1.4, size * 0.026);
      ctx.stroke();

      // Large grain head (oval)
      ctx.beginPath();
      ctx.ellipse(
        sx + lean * size,
        by - h * 0.46,
        size * 0.052,
        size * 0.185,
        lean * 2,
        0, Math.PI * 2
      );
      ctx.fillStyle = i % 2 === 0 ? '#e8a010' : '#f5c020';
      ctx.fill();

      // Highlight on grain head
      ctx.beginPath();
      ctx.ellipse(
        sx + lean * size - size * 0.014,
        by - h * 0.50,
        size * 0.020,
        size * 0.080,
        lean * 2,
        0, Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255,228,100,0.55)';
      ctx.fill();
    }

    // Binding wrap around middle of sheaf
    ctx.beginPath();
    ctx.moveTo(bx - size * 0.10, by + h * 0.06);
    ctx.lineTo(bx + size * 0.10, by + h * 0.06);
    ctx.strokeStyle = '#5c3e0c';
    ctx.lineWidth = Math.max(2.5, size * 0.044);
    ctx.stroke();
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  function mountain(
    x: number, y: number,
    w: number, h: number,
    bodyColor: string,
    snowA: number = 0.92,
    snowFrac: number = 0.36
  ) {
    // Left (shaded) face
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w * 0.5, y);
    ctx.lineTo(x + w * 0.05, y);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    // Dark left-face shadow
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w * 0.5, y);
    ctx.lineTo(x - w * 0.12, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(20,28,40,0.28)';
    ctx.fill();

    // Right (lighter) face
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w * 0.05, y);
    ctx.lineTo(x + w * 0.5, y);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w * 0.05, y);
    ctx.lineTo(x + w * 0.5, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(120,148,178,0.22)';
    ctx.fill();

    // Snow cap
    const sH = h * snowFrac;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w * 0.20, y - h + sH * 0.56);
    ctx.lineTo(x - w * 0.08, y - h + sH * 0.80);
    ctx.lineTo(x + w * 0.06, y - h + sH * 0.76);
    ctx.lineTo(x + w * 0.18, y - h + sH * 0.52);
    ctx.closePath();
    ctx.fillStyle = `rgba(230,240,252,${snowA})`;
    ctx.fill();
    // Snow shadow line
    ctx.beginPath();
    ctx.moveTo(x - w * 0.08, y - h + sH * 0.80);
    ctx.lineTo(x - w * 0.20, y - h + sH * 0.56);
    ctx.lineTo(x - w * 0.14, y - h + sH * 0.86);
    ctx.closePath();
    ctx.fillStyle = 'rgba(155,175,200,0.38)';
    ctx.fill();
  }

  // Distant background peaks
  mountain(cx + size * 0.30, cy + size * 0.06, size * 0.52, size * 0.42, 'rgba(108,132,162,0.72)', 0.80, 0.30);
  mountain(cx - size * 0.30, cy + size * 0.08, size * 0.48, size * 0.38, 'rgba(100,124,155,0.72)', 0.80, 0.28);
  // Mid peaks
  mountain(cx + size * 0.18, cy + size * 0.12, size * 0.62, size * 0.54, 'rgba(84,108,138,0.90)', 0.92, 0.35);
  // Front large peak
  mountain(cx - size * 0.08, cy + size * 0.16, size * 0.72, size * 0.64, 'rgba(72,94,122,1.0)', 0.98, 0.40);

  // Foreground boulders
  const boulders = [
    { x: cx - size * 0.40, y: cy + size * 0.40, rx: size * 0.12, ry: size * 0.08 },
    { x: cx + size * 0.34, y: cy + size * 0.38, rx: size * 0.10, ry: size * 0.07 },
    { x: cx - size * 0.08, y: cy + size * 0.43, rx: size * 0.08, ry: size * 0.06 },
  ];
  for (const b of boulders) {
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, Math.PI, 0);
    ctx.fillStyle = 'rgba(50,64,82,0.78)';
    ctx.fill();
    // Boulder highlight
    ctx.beginPath();
    ctx.ellipse(b.x - b.rx * 0.22, b.y - b.ry * 0.32, b.rx * 0.52, b.ry * 0.36, 0, Math.PI, 0);
    ctx.fillStyle = 'rgba(105,125,152,0.38)';
    ctx.fill();
  }
}

function drawPasture(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Rolling hills (back to front) — vivid green
  const hills = [
    { x: 0.18, y: 0.08, rx: 0.72, ry: 0.44, c: 'rgba(80,175,28,0.72)' },
    { x: -0.22, y: 0.16, rx: 0.64, ry: 0.40, c: 'rgba(72,162,22,0.76)' },
    { x: 0.12, y: 0.30, rx: 0.68, ry: 0.42, c: 'rgba(65,148,20,0.80)' },
  ];
  for (const h of hills) {
    ctx.beginPath();
    ctx.ellipse(cx + h.x * size, cy + h.y * size, h.rx * size, h.ry * size, 0, Math.PI, 0);
    ctx.fillStyle = h.c;
    ctx.fill();
  }

  // Grass blade strokes
  ctx.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const gx = cx + (((i * 137) % 100 - 50) / 100) * size * 0.88;
    const gy = cy + (((i * 71) % 60 - 5) / 100) * size;
    const gh = size * 0.058 + (i % 4) * size * 0.016;
    const lean = ((i % 5) - 2) * 0.12;
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh * 0.4);
    ctx.quadraticCurveTo(gx + lean * size * 0.04, gy, gx + lean * size * 0.06, gy - gh * 0.55);
    ctx.strokeStyle = `rgba(${48 + (i % 4) * 8},${140 + (i % 5) * 10},${15 + (i % 3) * 6},0.32)`;
    ctx.lineWidth = Math.max(0.6, size * 0.016);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Sheep flock
  const flock = [
    { x: cx - size * 0.30, y: cy - size * 0.00, dir: 1 },
    { x: cx + size * 0.26, y: cy - size * 0.16, dir: -1 },
    { x: cx + size * 0.04, y: cy + size * 0.22, dir: 1 },
  ];

  for (const sh of flock) {
    const sc = size * 0.155;
    const dir = sh.dir;

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(sh.x + sc * 0.08, sh.y + sc * 1.18, sc * 0.90, sc * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();

    // Wool — multiple overlapping ellipses
    const fluffs = [
      { dx: 0, dy: -sc * 0.06, rx: sc * 1.08, ry: sc * 0.74 },
      { dx: sc * 0.62, dy: -sc * 0.20, rx: sc * 0.74, ry: sc * 0.62 },
      { dx: -sc * 0.60, dy: -sc * 0.18, rx: sc * 0.72, ry: sc * 0.60 },
      { dx: sc * 0.26, dy: -sc * 0.42, rx: sc * 0.60, ry: sc * 0.50 },
      { dx: -sc * 0.24, dy: -sc * 0.40, rx: sc * 0.58, ry: sc * 0.48 },
    ];
    for (const f of fluffs) {
      ctx.beginPath();
      ctx.ellipse(sh.x + f.dx, sh.y + f.dy, f.rx, f.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,242,234,0.96)';
      ctx.fill();
    }
    // Wool shading
    ctx.beginPath();
    ctx.ellipse(sh.x + sc * 0.10, sh.y + sc * 0.06, sc * 0.96, sc * 0.64, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190,186,174,0.20)';
    ctx.fill();

    // Head
    const headX = sh.x + sc * 1.08 * dir;
    const headY = sh.y - sc * 0.30;
    ctx.beginPath();
    ctx.arc(headX, headY, sc * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#2a201a';
    ctx.fill();

    // Snout
    ctx.beginPath();
    ctx.ellipse(headX + sc * 0.18 * dir, headY + sc * 0.10, sc * 0.22, sc * 0.17, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#382c24';
    ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(headX + sc * 0.06 * dir, headY - sc * 0.12, sc * 0.10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + sc * 0.09 * dir, headY - sc * 0.10, sc * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = '#120e08';
    ctx.fill();

    // Ear
    ctx.beginPath();
    ctx.ellipse(headX - sc * 0.14 * dir, headY - sc * 0.14, sc * 0.14, sc * 0.10, -0.4 * dir, 0, Math.PI * 2);
    ctx.fillStyle = '#382c24';
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#2a1e16';
    ctx.lineWidth = Math.max(1.5, size * 0.030);
    ctx.lineCap = 'round';
    for (let l = 0; l < 4; l++) {
      const lx = sh.x - sc * 0.68 + l * sc * 0.48;
      ctx.beginPath();
      ctx.moveTo(lx, sh.y + sc * 0.56);
      ctx.lineTo(lx + sc * 0.06 * (l % 2 === 0 ? 1 : -1), sh.y + sc * 1.14);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // Daisies / wildflowers
  const flowers = [
    { x: -0.40, y: 0.30 }, { x: 0.44, y: 0.26 },
    { x: 0.20, y: 0.36 }, { x: -0.14, y: -0.26 },
    { x: 0.38, y: -0.20 }, { x: -0.44, y: -0.14 },
  ];
  for (const f of flowers) {
    const fx = cx + f.x * size;
    const fy = cy + f.y * size;
    const fr = size * 0.030;
    // Petals
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(ang) * fr * 1.4, fy + Math.sin(ang) * fr * 1.4, fr * 0.7, fr * 0.5, ang, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,200,0.88)';
      ctx.fill();
    }
    // Center
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,170,20,0.90)';
    ctx.fill();
  }
}

function drawHills(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Brick background — staggered rows — vivid red-orange
  const brickW = size * 0.238;
  const brickH = size * 0.108;
  const brickColors = [
    'rgba(196,72,28,0.90)',
    'rgba(178,58,20,0.90)',
    'rgba(212,84,32,0.90)',
  ];
  const mortarColor = 'rgba(74,26,8,0.55)';

  for (let row = -4; row <= 6; row++) {
    const rowY = cy - size * 0.65 + row * (brickH + 2.2);
    const offset = row % 2 === 0 ? 0 : brickW * 0.5;
    for (let col = -4; col <= 6; col++) {
      const bx = cx - size * 0.80 + col * (brickW + 2) + offset;
      const bc = brickColors[Math.abs(row * 3 + col) % 3];
      ctx.beginPath();
      ctx.rect(bx + 0.5, rowY + 0.5, brickW - 1, brickH - 1);
      ctx.fillStyle = bc;
      ctx.fill();
      // Top highlight
      ctx.beginPath();
      ctx.rect(bx + 0.5, rowY + 0.5, brickW - 1, brickH * 0.32);
      ctx.fillStyle = 'rgba(218,98,42,0.22)';
      ctx.fill();
      // Bottom shadow
      ctx.beginPath();
      ctx.rect(bx + 0.5, rowY + brickH * 0.70, brickW - 1, brickH * 0.28);
      ctx.fillStyle = 'rgba(50,18,5,0.22)';
      ctx.fill();
    }
    // Horizontal mortar
    ctx.beginPath();
    ctx.rect(cx - size * 0.82, rowY + brickH - 0.5, size * 1.64, 2.2);
    ctx.fillStyle = mortarColor;
    ctx.fill();
  }

  // Rolling terracotta hills on top of brickwork
  const hillDefs = [
    { x: cx - size * 0.22, y: cy + size * 0.36, r: size * 0.58, c1: 'rgba(146,48,16,0.80)', c2: 'rgba(176,66,24,0.65)' },
    { x: cx + size * 0.26, y: cy + size * 0.28, r: size * 0.50, c1: 'rgba(160,54,18,0.80)', c2: 'rgba(190,70,26,0.65)' },
    { x: cx, cy: cy, y: cy + size * 0.10, r: size * 0.46, c1: 'rgba(175,62,22,0.78)', c2: 'rgba(204,78,30,0.62)' },
  ];
  for (const h of hillDefs) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, Math.PI, 0);
    ctx.closePath();
    const grad = ctx.createRadialGradient(h.x - h.r * 0.25, h.y - h.r * 0.42, h.r * 0.06, h.x, h.y, h.r);
    grad.addColorStop(0, h.c2);
    grad.addColorStop(1, h.c1);
    ctx.fillStyle = grad;
    ctx.fill();
    // Hill rim highlight
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r * 0.91, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = 'rgba(212,96,46,0.28)';
    ctx.lineWidth = Math.max(1, size * 0.024);
    ctx.stroke();
  }
}

function drawDesert(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Warm sky gradient at top
  const skyGrad = ctx.createLinearGradient(cx, cy - size * 0.82, cx, cy - size * 0.05);
  skyGrad.addColorStop(0, 'rgba(245,185,78,0.44)');
  skyGrad.addColorStop(0.55, 'rgba(225,162,48,0.16)');
  skyGrad.addColorStop(1, 'rgba(205,152,40,0.0)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 0.82);

  // Sun
  const sunX = cx + size * 0.30;
  const sunY = cy - size * 0.44;
  const sunR = size * 0.092;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 1.8);
  sunGrad.addColorStop(0, 'rgba(255,220,90,0.50)');
  sunGrad.addColorStop(0.5, 'rgba(255,200,60,0.22)');
  sunGrad.addColorStop(1, 'rgba(255,180,40,0.0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR * 2, sunY - sunR * 2, sunR * 4, sunR * 4);
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,80,0.40)';
  ctx.fill();

  // Sand dunes
  const dunes = [
    { x: 0.10, y: 0.20, rx: 0.78, ry: 0.30, cLight: 'rgba(188,158,52,0.60)', cDark: 'rgba(162,132,36,0.68)' },
    { x: -0.18, y: 0.34, rx: 0.72, ry: 0.34, cLight: 'rgba(196,164,58,0.64)', cDark: 'rgba(168,138,40,0.72)' },
    { x: 0.20, y: 0.48, rx: 0.65, ry: 0.32, cLight: 'rgba(202,170,62,0.64)', cDark: 'rgba(174,144,44,0.72)' },
  ];
  for (const d of dunes) {
    // Shadow side (right)
    ctx.beginPath();
    ctx.ellipse(cx + d.x * size, cy + d.y * size, d.rx * size, d.ry * size, 0, Math.PI, 0);
    ctx.fillStyle = d.cDark;
    ctx.fill();
    // Light side (upper-left)
    ctx.beginPath();
    ctx.ellipse(
      cx + d.x * size - d.rx * size * 0.18,
      cy + d.y * size - d.ry * size * 0.28,
      d.rx * size * 0.58,
      d.ry * size * 0.22,
      0, Math.PI, 0
    );
    ctx.fillStyle = d.cLight;
    ctx.fill();
  }

  // Ripple lines
  for (let i = 0; i < 6; i++) {
    const ry = cy - size * 0.08 + i * size * 0.11;
    const rw = size * (0.50 - i * 0.02);
    const rOff = i % 2 === 0 ? size * 0.042 : -size * 0.038;
    ctx.beginPath();
    ctx.ellipse(cx + rOff, ry, rw, size * 0.030, 0, 0, Math.PI);
    ctx.strokeStyle = `rgba(148,116,28,${0.26 - i * 0.02})`;
    ctx.lineWidth = Math.max(0.6, size * 0.016);
    ctx.stroke();
  }

  // Cactus
  const cactusX = cx + size * 0.06;
  const cactusY = cy + size * 0.22;
  const cs = size * 0.115;
  const cgDark = '#1d5c1d';
  const cgMid = '#2a7a2a';
  const cgLight = '#3a9a3a';

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(cactusX + cs * 0.4, cactusY + cs * 0.25, cs * 1.25, cs * 0.26, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  // Left arm (horizontal then up)
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.18, cactusY - cs * 1.08, cs * 0.88, cs * 0.50);
  ctx.fillStyle = cgMid;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.18, cactusY - cs * 1.58, cs * 0.50, cs * 0.55);
  ctx.fillStyle = cgMid;
  ctx.fill();
  // Left arm shadow
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.18, cactusY - cs * 1.08, cs * 0.88, cs * 0.10);
  ctx.fillStyle = cgDark;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cactusX - cs * 1.18, cactusY - cs * 1.58, cs * 0.12, cs * 0.55);
  ctx.fillStyle = cgDark;
  ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.30, cactusY - cs * 0.88, cs * 0.88, cs * 0.50);
  ctx.fillStyle = cgMid;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.62, cactusY - cs * 1.38, cs * 0.50, cs * 0.55);
  ctx.fillStyle = cgMid;
  ctx.fill();
  // Right arm shadow
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.30, cactusY - cs * 0.88, cs * 0.88, cs * 0.10);
  ctx.fillStyle = cgDark;
  ctx.fill();

  // Main trunk (drawn last = on top of arms)
  ctx.beginPath();
  ctx.rect(cactusX - cs * 0.30, cactusY - cs * 2.25, cs * 0.60, cs * 2.55);
  ctx.fillStyle = cgMid;
  ctx.fill();
  // Trunk shadow (left stripe)
  ctx.beginPath();
  ctx.rect(cactusX - cs * 0.30, cactusY - cs * 2.25, cs * 0.12, cs * 2.55);
  ctx.fillStyle = cgDark;
  ctx.fill();
  // Trunk highlight (right stripe)
  ctx.beginPath();
  ctx.rect(cactusX + cs * 0.14, cactusY - cs * 2.25, cs * 0.06, cs * 2.55);
  ctx.fillStyle = cgLight;
  ctx.fill();

  // Spines
  ctx.strokeStyle = 'rgba(205,188,108,0.72)';
  ctx.lineWidth = Math.max(0.5, size * 0.011);
  const spines = [
    [cactusX + cs * 0.32, cactusY - cs * 0.70],
    [cactusX + cs * 0.32, cactusY - cs * 1.30],
    [cactusX + cs * 0.32, cactusY - cs * 1.90],
    [cactusX - cs * 0.32, cactusY - cs * 0.55],
    [cactusX - cs * 0.32, cactusY - cs * 1.15],
    [cactusX - cs * 0.32, cactusY - cs * 1.75],
  ];
  for (const [spX, spY] of spines) {
    const sDir = spX > cactusX ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(spX, spY);
    ctx.lineTo(spX + cs * 0.30 * sDir, spY - cs * 0.09);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(spX, spY);
    ctx.lineTo(spX + cs * 0.26 * sDir, spY + cs * 0.11);
    ctx.stroke();
  }
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
  const r = Math.max(16, hexSize * 0.245);
  const pips = PIPS[number] || 0;

  // Drop shadow
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.09, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.40)';
  ctx.fill();

  // Outer dark ring (wood border)
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = isRed ? '#58100a' : '#38260a';
  ctx.fill();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.8, 0, Math.PI * 2);
  ctx.fillStyle = isRed ? '#7a1e0e' : '#583c0e';
  ctx.fill();

  // Parchment face with radial gradient
  const faceGrad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, r * 0.04, cx, cy, r);
  faceGrad.addColorStop(0, '#f6ebb8');
  faceGrad.addColorStop(0.55, '#e9d288');
  faceGrad.addColorStop(1, '#d3b558');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Number text
  const fontSize = Math.round(r * 1.14);
  ctx.font = `bold ${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isRed ? '#c81802' : '#180e02';
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 2;
  ctx.fillText(String(number), cx, cy - r * 0.09);
  ctx.shadowBlur = 0;

  // Pips
  const pipR = Math.max(1.5, r * 0.094);
  const pipSpacing = pipR * 2.45;
  const pipY = cy + r * 0.48;
  const totalW = (pips - 1) * pipSpacing;
  for (let i = 0; i < pips; i++) {
    const px = cx - totalW / 2 + i * pipSpacing;
    ctx.beginPath();
    ctx.arc(px, pipY, pipR, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? '#c81802' : '#281802';
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

  const grad = ctx.createRadialGradient(cx - size * 0.22, cy - size * 0.22, size * 0.08, cx, cy, size * 1.0);
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

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(10,30,70,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

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
  const shadowC = hexCorners(cx + size * 0.038, cy + size * 0.052, size * 0.97);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(shadowC[i].x, shadowC[i].y);
    else ctx.lineTo(shadowC[i].x, shadowC[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fill();

  // Main hex fill — radial gradient
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();

  const mainGrad = ctx.createRadialGradient(
    cx - size * 0.28, cy - size * 0.28, size * 0.04,
    cx + size * 0.10, cy + size * 0.10, size * 1.12
  );
  mainGrad.addColorStop(0, col.light);
  mainGrad.addColorStop(0.42, col.mid);
  mainGrad.addColorStop(1, col.base);
  ctx.fillStyle = mainGrad;
  ctx.fill();

  // Clip terrain illustration to inner hex area
  ctx.save();
  const innerC = hexCorners(cx, cy, size * 0.86);
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

  // Rim — darker version of tile color gives the "physical tile" border feel
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
    else ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,0.78)';
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // Inner bevel (light ring just inside the edge)
  const bevelC = hexCorners(cx, cy, size * 0.89);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    if (i === 0) ctx.moveTo(bevelC[i].x, bevelC[i].y);
    else ctx.lineTo(bevelC[i].x, bevelC[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Top-left edge highlight
  ctx.beginPath();
  ctx.moveTo(corners[3].x, corners[3].y);
  ctx.lineTo(corners[4].x, corners[4].y);
  ctx.lineTo(corners[5].x, corners[5].y);
  ctx.lineTo(corners[0].x, corners[0].y);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Bottom-right edge shadow
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

  ctx.clearRect(0, 0, W, H);

  // Background — warm board surface, clearly distinct from page bg
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
  bgGrad.addColorStop(0, '#3a2c18');
  bgGrad.addColorStop(0.55, '#2a1e10');
  bgGrad.addColorStop(1, '#180e06');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle texture / vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.18, W / 2, H / 2, W * 0.72);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  const allHexes = [
    ...board.tiles.map((t) => t.coord),
    ...(board.waterHexes || []),
  ];
  const { hexSize, origin } = computeRenderParams(allHexes, W, H, 32);

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

  for (const tile of board.tiles) {
    const { x, y } = axialToPixel(tile.coord.q, tile.coord.r, hexSize, origin);
    drawLandHex(ctx, x, y, hexSize, tile);
  }

  for (const tile of board.tiles) {
    if (!tile.number) continue;
    const { x, y } = axialToPixel(tile.coord.q, tile.coord.r, hexSize, origin);
    drawNumberToken(ctx, x, y, tile.number, hexSize);
  }
}
