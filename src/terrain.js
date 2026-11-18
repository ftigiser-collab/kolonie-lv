// Geländeberechnung: Höhenfeld mit weichen Übergängen, Schummerung, Krater, dann scharfe Details
import { center, hexPath, R, HW, pixelToHex, neighbors } from './hex.js';
import { Noise, mulberry32, clamp, shade, rgba } from './util.js';

const ELEV = { dust: 0.3, rock: 0.5, ridge: 0.95, chasm: -0.9, deck: 0.3, road: 0.28, wreck: 0.55, pad: 0.3 };
const ROUGH = { dust: 0.05, rock: 0.55, ridge: 1, chasm: 0.3, deck: 0, road: 0, wreck: 0.6, pad: 0 };
const COL = {
  dust: [104, 90, 80], rock: [86, 79, 76], ridge: [72, 68, 70], chasm: [14, 12, 16],
  deck: [100, 88, 78], road: [92, 81, 72], wreck: [50, 44, 58], pad: [100, 88, 78],
};
const TAU = Math.PI * 2;

function boxBlur(a, w, h, r) {
  const tmp = new Float32Array(a.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0; const o = y * w;
    for (let x = -r; x <= r; x++) s += a[o + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) { tmp[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { a[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
}

export function bakeTerrain(m) {
  const { w, h } = m.size;
  const W = Math.ceil(w), H = Math.ceil(h);
  const S = 0.5, lw = Math.ceil(W * S), lh = Math.ceil(H * S), n = lw * lh;
  const N1 = new Noise(m.seed + 11), N2 = new Noise(m.seed + 23), N3 = new Noise(m.seed + 37), rnd = mulberry32(m.seed + 51);
  const T = (c, r) => m.t[r * m.W + c];
  const hgt = new Float32Array(n), cr = new Float32Array(n), cg = new Float32Array(n), cb = new Float32Array(n), rough = new Float32Array(n);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const wx = x / S, wy = y / S;
    const ox = (N1.fbm(wx * 0.009, wy * 0.009, 3) - 0.5) * 50, oy = (N2.fbm(wx * 0.009 + 40, wy * 0.009, 3) - 0.5) * 50;
    const hx = pixelToHex(wx + ox, wy + oy);
    const c = clamp(hx.col, 0, m.W - 1), r = clamp(hx.row, 0, m.H - 1), k = T(c, r), i = y * lw + x;
    hgt[i] = ELEV[k]; rough[i] = ROUGH[k];
    const col = COL[k]; cr[i] = col[0]; cg[i] = col[1]; cb[i] = col[2];
  }
  for (const a of [hgt, cr, cg, cb, rough]) { boxBlur(a, lw, lh, 4); boxBlur(a, lw, lh, 3); }
  // Detail: Rauschen, Rillen, Krater
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = y * lw + x, wx = x / S, wy = y / S, ro = rough[i];
    const big = N1.fbm(wx * 0.006, wy * 0.006, 4) - 0.5;
    const fine = N2.fbm(wx * 0.05, wy * 0.05, 3) - 0.5;
    const ridged = 1 - Math.abs(N3.fbm(wx * 0.022, wy * 0.022, 4) * 2 - 1);
    hgt[i] += big * 0.35 + fine * (0.04 + ro * 0.12) + ridged * ridged * ro * 0.45;
    // Windrippel auf Staub
    hgt[i] += Math.sin(wx * 0.18 + wy * 0.05 + N3.v(wx * 0.01, wy * 0.01) * 6) * 0.012 * (1 - ro);
  }
  const craters = Math.round(m.W * m.H / 45);
  for (let k = 0; k < craters; k++) {
    const cx = rnd() * lw, cy = rnd() * lh, i0 = Math.floor(cy) * lw + Math.floor(cx);
    if (rough[i0] > 0.35 || hgt[i0] < 0) continue;
    const rad = (6 + rnd() * rnd() * 34) * S * 2;
    for (let y = Math.max(0, Math.floor(cy - rad * 1.6)); y < Math.min(lh, cy + rad * 1.6); y++)
      for (let x = Math.max(0, Math.floor(cx - rad * 1.6)); x < Math.min(lw, cx + rad * 1.6); x++) {
        const d = Math.hypot(x - cx, y - cy) / rad;
        if (d > 1.6) continue;
        const i = y * lw + x;
        hgt[i] += (d < 1 ? -(1 - d * d) * 0.16 : 0) + Math.exp(-((d - 1) ** 2) / 0.04) * 0.07;
      }
  }
  // Schummerung
  const img = new ImageData(lw, lh), D = img.data;
  const L = [-0.55, -0.72, 0.42], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = y * lw + x;
    const hx = hgt[y * lw + Math.min(lw - 1, x + 1)] - hgt[y * lw + Math.max(0, x - 1)];
    const hy = hgt[Math.min(lh - 1, y + 1) * lw + x] - hgt[Math.max(0, y - 1) * lw + x];
    const nx = -hx * 9, ny = -hy * 9, nz = 1, nl = Math.hypot(nx, ny, nz);
    const d = clamp((nx * L[0] + ny * L[1] + nz * L[2]) / nl, 0, 1);
    let lit = 0.3 + d * 0.95;
    const depth = hgt[i] < 0 ? clamp(1 + hgt[i] * 1.1, 0.08, 1) : 1;
    const g = (rnd() - 0.5) * 7;
    const amb = 1 - d;
    D[i * 4] = clamp(cr[i] * lit * depth - amb * 6 + g, 0, 255);
    D[i * 4 + 1] = clamp(cg[i] * lit * depth - amb * 3 + g, 0, 255);
    D[i * 4 + 2] = clamp(cb[i] * lit * depth + amb * 7 + g, 0, 255);
    D[i * 4 + 3] = 255;
  }
  const low = document.createElement('canvas'); low.width = lw; low.height = lh;
  low.getContext('2d').putImageData(img, 0, 0);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, W, H);

  // ---------- scharfe Details ----------
  const isFlat = (k) => k === 'deck' || k === 'pad' || k === 'road';
  // Fahrwege als durchgehende Bänder
  const roadish = (c, r) => ['road', 'deck', 'pad'].includes(T(c, r)) || m.sites.some((s) => s.c === c && s.r === r);
  const segs = [];
  for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) {
    if (T(c, r) !== 'road') continue;
    const a = center(c, r);
    for (const [x, y] of neighbors(c, r, m.W, m.H)) if (roadish(x, y) && (T(x, y) !== 'road' || x * 1000 + y > c * 1000 + r)) { const b = center(x, y); segs.push([a, T(x, y) === 'road' ? b : { x: (a.x + b.x) / 2 + (b.x - a.x) * 0.2, y: (a.y + b.y) / 2 + (b.y - a.y) * 0.2 }]); }
    if (!neighbors(c, r, m.W, m.H).some(([x, y]) => roadish(x, y))) segs.push([a, { x: a.x + 1, y: a.y }]);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const stroke = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (const [a, b] of segs) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } ctx.stroke(); };
  stroke(34, 'rgba(40,34,30,0.25)'); stroke(26, 'rgba(58,50,44,0.85)'); stroke(22, 'rgba(78,68,60,0.9)');
  ctx.setLineDash([]);
  for (const off of [-6, 6]) {
    ctx.strokeStyle = 'rgba(40,34,30,0.55)'; ctx.lineWidth = 2.2; ctx.beginPath();
    for (const [a, b] of segs) { const L2 = Math.hypot(b.x - a.x, b.y - a.y) || 1, px = -(b.y - a.y) / L2 * off, py = (b.x - a.x) / L2 * off; ctx.moveTo(a.x + px, a.y + py); ctx.lineTo(b.x + px, b.y + py); }
    ctx.stroke();
  }
  // Felsbrocken mit Licht und Schatten
  const rock = (x, y, s) => {
    const pts = []; const k = 6 + Math.floor(rnd() * 3);
    for (let i = 0; i < k; i++) { const a = i / k * TAU + rnd() * 0.4, rr = s * (0.65 + rnd() * 0.45); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78]); }
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px + s * 0.35, py + s * 0.45) : ctx.moveTo(px + s * 0.35, py + s * 0.45)); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s); g.addColorStop(0, '#8d847c'); g.addColorStop(0.55, '#5d5652'); g.addColorStop(1, '#2f2b2b');
    ctx.fillStyle = g; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,225,0.12)'; ctx.beginPath(); ctx.ellipse(x - s * 0.3, y - s * 0.3, s * 0.35, s * 0.22, -0.6, 0, TAU); ctx.fill();
  };
  for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) {
    const k = T(c, r), p = center(c, r);
    if (k === 'rock' || k === 'ridge' || k === 'wreck') {
      const cnt = k === 'ridge' ? 4 : k === 'rock' ? 6 : 2, big = k === 'ridge' ? 1.7 : 1;
      for (let i = 0; i < cnt; i++) rock(p.x + (rnd() - 0.5) * R * 1.4, p.y + (rnd() - 0.5) * R * 1.2, (2.5 + rnd() * rnd() * 8) * big);
    } else if (k === 'dust') {
      for (let i = 0; i < 3; i++) if (rnd() < 0.6) rock(p.x + (rnd() - 0.5) * R * 1.5, p.y + (rnd() - 0.5) * R * 1.3, 1 + rnd() * 2.2);
    }
  }
  // Koloniedeck und Landefeld: Platten mit Fase und Warnstreifen an den Rändern
  for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) {
    const k = T(c, r); if (k !== 'deck' && k !== 'pad') continue;
    const p = center(c, r);
    ctx.save(); ctx.beginPath(); hexPath(ctx, p.x, p.y, R + 0.6); ctx.clip();
    const g = ctx.createLinearGradient(p.x - R, p.y - R, p.x + R, p.y + R);
    if (k === 'deck') { g.addColorStop(0, '#666d75'); g.addColorStop(1, '#41474e'); } else { g.addColorStop(0, '#6a6c64'); g.addColorStop(1, '#46483f'); }
    ctx.fillStyle = g; ctx.fillRect(p.x - R * 1.2, p.y - R * 1.2, R * 2.4, R * 2.4);
    const step = k === 'deck' ? 14 : 22;
    for (let x = -R * 1.2; x < R * 1.2; x += step) for (let y = -R * 1.2; y < R * 1.2; y += step) {
      const sh = (rnd() - 0.5) * 0.08;
      ctx.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`;
      ctx.fillRect(p.x + x + 1, p.y + y + 1, step - 2, step - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(p.x + x, p.y + y + step - 1, step, 1); ctx.fillRect(p.x + x + step - 1, p.y + y, 1, step);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(p.x + x, p.y + y, step, 1);
      if (k === 'deck') { ctx.fillStyle = 'rgba(200,210,220,0.18)'; ctx.fillRect(p.x + x + 2, p.y + y + 2, 1.3, 1.3); ctx.fillRect(p.x + x + step - 4, p.y + y + step - 4, 1.3, 1.3); }
    }
    // Schmutz
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(60,48,38,0.18)'; ctx.beginPath(); ctx.ellipse(p.x + (rnd() - 0.5) * R * 1.4, p.y + (rnd() - 0.5) * R * 1.4, 4 + rnd() * 10, 3 + rnd() * 6, rnd() * 3, 0, TAU); ctx.fill(); }
    if (k === 'pad') {
      ctx.strokeStyle = 'rgba(235,215,150,0.5)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.66, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(235,215,150,0.45)'; ctx.fillRect(p.x - 8, p.y - 10, 3.5, 20); ctx.fillRect(p.x + 4.5, p.y - 10, 3.5, 20); ctx.fillRect(p.x - 4.5, p.y - 1.7, 9, 3.4);
    }
    ctx.restore();
    // Kanten nach außen: Warnstreifen
    const cs = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); cs.push([p.x + R * Math.cos(a), p.y + R * Math.sin(a)]); }
    const nb = neighbors(c, r, m.W, m.H);
    for (let i = 0; i < 6; i++) {
      const a = cs[i], b = cs[(i + 1) % 6], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const q = pixelToHex(p.x + (mx - p.x) * 1.9, p.y + (my - p.y) * 1.9);
      const out = !nb.some(([x, y]) => x === q.col && y === q.row && isFlat(T(x, y)));
      if (!out) continue;
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#e1aa22'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      ctx.strokeStyle = '#17130b'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0] + 1.5, a[1] + 2); ctx.lineTo(b[0] + 1.5, b[1] + 2); ctx.stroke();
      ctx.restore();
    }
  }
  // Wrack am Nest
  { const p = center(m.nest.c, m.nest.r); ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(12, 16, 82, 40, -0.3, 0, TAU); ctx.fill();
    ctx.rotate(-0.3);
    const gr = ctx.createLinearGradient(0, -36, 0, 34); gr.addColorStop(0, '#4a4256'); gr.addColorStop(0.5, '#262030'); gr.addColorStop(1, '#100c16');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-78, 2); ctx.bezierCurveTo(-66, -40, 46, -46, 76, -8); ctx.lineTo(58, 4); ctx.bezierCurveTo(78, 24, 0, 40, -66, 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(170,150,210,0.22)'; ctx.lineWidth = 2.5;
    for (let i = -58; i < 58; i += 11) { ctx.beginPath(); ctx.moveTo(i, -30 + Math.abs(i) * 0.12); ctx.quadraticCurveTo(i + 7, 0, i - 2, 26 - Math.abs(i) * 0.1); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-70, 4); ctx.bezierCurveTo(-30, -14, 30, -18, 70, -6); ctx.stroke();
    const hole = ctx.createRadialGradient(-6, 4, 2, -6, 4, 20); hole.addColorStop(0, '#000'); hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole; ctx.beginPath(); ctx.ellipse(-6, 4, 20, 11, 0.2, 0, TAU); ctx.fill();
    ctx.restore(); }
  // Hexgitter, sehr dezent
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) { const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, R); ctx.stroke(); }
  return cv;
}

// Bleibende Spuren auf dem Boden
export function paintDecal(cv, kind, x, y, s = 1) {
  const ctx = cv.getContext('2d'), rnd = Math.random;
  ctx.save(); ctx.translate(x, y);
  if (kind === 'scorch') {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30 * s); g.addColorStop(0, 'rgba(10,8,6,0.75)'); g.addColorStop(0.6, 'rgba(20,16,12,0.45)'); g.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) { const a = rnd() * TAU, l = (14 + rnd() * 18) * s; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6 * s, Math.sin(a) * 6 * s); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke(); }
  } else if (kind === 'acid') {
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU, d = rnd() * 16 * s, r = (3 + rnd() * 7) * s;
      const g = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, r);
      g.addColorStop(0, 'rgba(30,26,12,0.8)'); g.addColorStop(0.7, 'rgba(90,110,30,0.35)'); g.addColorStop(1, 'rgba(120,150,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(14,16,22,0.9)';
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(rnd() * TAU); ctx.fillRect(4 + rnd() * 8, -1, 4 + rnd() * 5, 2); ctx.restore(); }
  } else if (kind === 'blood') {
    for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(70,16,12,${0.35 + rnd() * 0.3})`; ctx.beginPath(); ctx.ellipse((rnd() - 0.5) * 14, (rnd() - 0.5) * 12, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(40,36,30,0.7)'; ctx.fillRect(-4, -1, 8, 2);
  } else if (kind === 'wreck') {
    paintDecal(cv, 'scorch', 0, 0, s * 0.9);
    ctx.rotate(rnd() * TAU);
    ctx.fillStyle = '#211e1c'; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(10, -10); ctx.lineTo(16, 2); ctx.lineTo(6, 10); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a3532'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(8, -6); ctx.moveTo(-8, 4); ctx.lineTo(10, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,40,0.25)'; ctx.beginPath(); ctx.arc(2, 0, 4, 0, TAU); ctx.fill();
  } else if (kind === 'rubble') {
    for (let i = 0; i < 18; i++) { ctx.fillStyle = shade('#5a5a5c', (rnd() - 0.5) * 0.5); ctx.save(); ctx.translate((rnd() - 0.5) * 34, (rnd() - 0.5) * 28); ctx.rotate(rnd() * 3); ctx.fillRect(-3, -2, 3 + rnd() * 6, 2 + rnd() * 4); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 12, 0, 0, TAU); ctx.fill();
  } else if (kind === 'crater') {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 * s); g.addColorStop(0, 'rgba(6,5,4,0.85)'); g.addColorStop(0.35, 'rgba(18,14,10,0.6)'); g.addColorStop(0.75, 'rgba(30,24,18,0.25)'); g.addColorStop(1, 'rgba(30,24,18,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 70 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,120,100,0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-2, -2, 26 * s, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { const a = rnd() * TAU, l = (30 + rnd() * 40) * s; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20 * s, Math.sin(a) * 20 * s); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke(); }
  } else if (kind === 'tracks') {
    ctx.strokeStyle = 'rgba(30,26,22,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -s); ctx.lineTo(-6, s); ctx.moveTo(6, -s); ctx.lineTo(6, s); ctx.stroke();
  }
  ctx.restore();
}
