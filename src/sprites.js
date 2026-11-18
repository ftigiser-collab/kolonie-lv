// Alle Figuren, Fahrzeuge, Bauten und Orte werden per Code gezeichnet (Draufsicht)
import { shade, rgba } from './util.js';

const TAU = Math.PI * 2;
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function shadow(ctx, rx, ry, a = 0.45, ox = 2, oy = 3) { ctx.fillStyle = `rgba(0,0,0,${a})`; ell(ctx, ox, oy, rx, ry); ctx.fill(); }
function stripes(ctx, x, y, w, h, n = 5) {
  ctx.save(); rr(ctx, x, y, w, h, 1); ctx.clip();
  ctx.fillStyle = '#e8b320'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#16120a';
  for (let i = -n; i < n * 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / n, y + h); ctx.lineTo(x + i * w / n + h, y); ctx.lineTo(x + i * w / n + h + w / n / 2, y); ctx.lineTo(x + i * w / n + w / n / 2, y + h); ctx.fill(); }
  ctx.restore();
}

// ---------- Infanterie ----------
const KIT = { flammer: 'flamer', miliz: 'rifle', spaeher: 'tracker', techniker: 'torch', brenner: 'flamer', werfer: 'tube', schuetze: 'pulse', unteroff: 'tracker', smartgun: 'smart', pionier: 'torch', sani: 'med' };
function trooper(ctx, col, kit, marine, t, lead) {
  const armor = marine ? '#3b4a3a' : '#5a4a3a', skin = marine ? '#2d3a2c' : '#6a5440';
  // Waffe
  ctx.lineCap = 'round';
  if (kit === 'flamer') {
    ctx.fillStyle = '#7a2a18'; rr(ctx, -9, -4, 6, 8, 2); ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(12, 2); ctx.stroke();
    ctx.fillStyle = '#ff9a3a'; ell(ctx, 13, 2, 1.6, 1.6); ctx.fill();
  } else if (kit === 'tube') {
    ctx.strokeStyle = '#4a4f3a'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(12, -3); ctx.stroke();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(12, -5); ctx.lineTo(12, -1); ctx.stroke();
  } else if (kit === 'smart') {
    ctx.strokeStyle = '#1e2420'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(13, 4); ctx.stroke();
    ctx.strokeStyle = '#59614e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(2, 0, 0, 6); ctx.stroke();
    ctx.fillStyle = '#ff4030'; ell(ctx, 4, -4, 1.2, 1.2); ctx.fill();
  } else if (kit !== 'med') {
    ctx.strokeStyle = kit === 'pulse' ? '#1b211c' : '#2b2622'; ctx.lineWidth = kit === 'pulse' ? 3 : 2.3;
    ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(kit === 'torch' ? 8 : 12, 3); ctx.stroke();
    if (kit === 'torch') { ctx.fillStyle = `rgba(150,220,255,${0.5 + 0.5 * Math.sin(t * 20)})`; ell(ctx, 9, 3, 1.6, 1.6); ctx.fill(); }
  }
  // Rucksack
  ctx.fillStyle = shade(armor, -0.35); rr(ctx, -7.5, -3.6, 4, 7.2, 1.5); ctx.fill();
  // Rumpf
  const bg = ctx.createLinearGradient(-5, -6, 4, 6); bg.addColorStop(0, shade(armor, 0.25)); bg.addColorStop(1, shade(armor, -0.3));
  ctx.fillStyle = bg; ell(ctx, 0, 0, 5.2, 6.8); ctx.fill();
  ctx.fillStyle = shade(col, -0.15); ell(ctx, -0.3, -5.2, 2.3, 1.6); ctx.fill(); ell(ctx, -0.3, 5.2, 2.3, 1.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -0.8, -5.6, 1.1, 0.6); ctx.fill(); ell(ctx, -0.8, 4.8, 1.1, 0.6); ctx.fill();
  if (kit === 'tracker') { ctx.fillStyle = '#0b1a10'; rr(ctx, 2.5, -3.5, 4.5, 4, 1); ctx.fill(); ctx.fillStyle = `rgba(90,255,150,${0.6 + 0.4 * Math.sin(t * 6)})`; ell(ctx, 4.7, -1.5, 1.2, 1.2); ctx.fill(); }
  if (kit === 'med') { ctx.fillStyle = '#e8eef0'; rr(ctx, -6, -3, 5, 6, 1); ctx.fill(); ctx.fillStyle = '#3aa0e0'; ctx.fillRect(-4.2, -2, 1.4, 4); ctx.fillRect(-5.3, -0.7, 3.6, 1.4); }
  // Helm
  ctx.fillStyle = skin; ell(ctx, 0.5, 0, 3.6, 3.4); ctx.fill();
  const hg = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 3.6); hg.addColorStop(0, marine ? '#7a8a70' : '#b09474'); hg.addColorStop(1, marine ? '#3e4a38' : '#5e4a36');
  ctx.fillStyle = hg; ell(ctx, 0, 0, 3.4, 3.2); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-0.6, -3.1, 1.2, 6.2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -0.9, -1.1, 1.4, 1); ctx.fill();
  if (marine) { ctx.fillStyle = 'rgba(255,250,200,0.9)'; ell(ctx, 3.2, -1.6, 0.9, 0.9); ctx.fill(); }
  if (lead) { ctx.strokeStyle = col; ctx.lineWidth = 0.8; ell(ctx, 0, 0, 3.6, 3.4); ctx.stroke(); }
}
function synthFigure(ctx, col, t) {
  shadow(ctx, 8, 7, 0.4, 2, 3);
  ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(13, 4); ctx.stroke();
  const g = ctx.createLinearGradient(-6, -8, 6, 8); g.addColorStop(0, '#eef0ee'); g.addColorStop(1, '#a8aeb0');
  ctx.fillStyle = g; ell(ctx, 0, 0, 6, 8); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-5.5, -1, 11, 2);
  ctx.fillStyle = '#f4f6f4'; ell(ctx, 0.5, 0, 4, 3.8); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ell(ctx, -0.5, 1, 3, 2.4); ctx.fill();
  const a = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.fillStyle = col === '#a98cff' ? `rgba(200,140,255,${a})` : `rgba(140,220,255,${a})`; ell(ctx, 3.3, -1.2, 1, 1); ctx.fill(); ell(ctx, 3.3, 1.2, 1, 1); ctx.fill();
}
export function drawInfantry(ctx, type, col, marine, face, t) {
  if (type === 'synth') { ctx.save(); ctx.rotate(face); ctx.scale(1.1, 1.1); synthFigure(ctx, col, t); ctx.restore(); return; }
  const kit = KIT[type] || 'rifle';
  const n = type === 'smartgun' || type === 'werfer' || type === 'brenner' || type === 'flammer' ? 2 : 3;
  const spots = n === 3 ? [[5, 0], [-5, -7], [-5, 7]] : [[4, -3], [-5, 5]];
  ctx.save(); ctx.rotate(face);
  for (const [x, y] of spots) { ctx.save(); ctx.translate(x, y); shadow(ctx, 6, 5, 0.35, 1.5, 2); ctx.restore(); }
  spots.forEach(([x, y], i) => { ctx.save(); ctx.translate(x, y); ctx.scale(0.92, 0.92); trooper(ctx, col, kit, marine, t + i, i === 0); ctx.restore(); });
  ctx.restore();
}

// ---------- Fahrzeuge ----------
export function drawLademech(ctx, col, face, t) {
  ctx.save(); ctx.rotate(face);
  shadow(ctx, 15, 13, 0.45, 3, 4);
  // Beine
  ctx.fillStyle = '#2a2622';
  for (const s of [-1, 1]) { rr(ctx, -10, s * 9 - 3, 9, 6, 2); ctx.fill(); }
  // Arme mit Klauen
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#3a342c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, s * 8); ctx.lineTo(10, s * 9); ctx.stroke();
    ctx.fillStyle = '#d9a21c'; rr(ctx, 6, s * 9 - 3, 9, 6, 1.5); ctx.fill();
    ctx.strokeStyle = '#1a1712'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(15, s * 9 - 3); ctx.lineTo(19, s * 9 - 4); ctx.moveTo(15, s * 9 + 3); ctx.lineTo(19, s * 9 + 4); ctx.stroke();
  }
  // Rahmen
  ctx.fillStyle = '#e1aa22'; rr(ctx, -9, -7, 15, 14, 3); ctx.fill();
  stripes(ctx, -9, -7, 4, 14, 3);
  ctx.strokeStyle = '#1d1a14'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(-3, 7); ctx.moveTo(3, -7); ctx.lineTo(3, 7); ctx.stroke();
  // Fahrer
  ctx.fillStyle = '#6a5440'; ell(ctx, 0, 0, 3.3, 3.3); ctx.fill();
  ctx.fillStyle = col; ell(ctx, -0.5, 0, 2.2, 2.2); ctx.fill();
  ctx.fillStyle = `rgba(255,170,40,${0.5 + 0.5 * Math.sin(t * 5)})`; ell(ctx, -8, -6, 1.3, 1.3); ctx.fill();
  ctx.restore();
}
export function drawSchlepper(ctx, col, face, t) {
  ctx.save(); ctx.rotate(face);
  shadow(ctx, 18, 13, 0.45, 3, 4);
  ctx.fillStyle = '#1b1a18'; rr(ctx, -16, -12, 30, 6, 2); ctx.fill(); rr(ctx, -16, 6, 30, 6, 2); ctx.fill();
  ctx.strokeStyle = '#3a3733'; ctx.lineWidth = 1; for (let i = -15; i < 14; i += 3) { ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i, -6); ctx.moveTo(i, 6); ctx.lineTo(i, 12); ctx.stroke(); }
  ctx.fillStyle = '#8a6a3a'; rr(ctx, -14, -7, 26, 14, 3); ctx.fill();
  ctx.fillStyle = shade('#8a6a3a', -0.25); rr(ctx, -14, -7, 16, 14, 2); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-12, -7, 3, 14);
  ctx.fillStyle = '#4c4a44'; rr(ctx, 3, -6, 9, 12, 2); ctx.fill();
  ctx.fillStyle = 'rgba(160,210,230,0.7)'; rr(ctx, 8, -4.5, 3, 9, 1); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.95)'; ell(ctx, 13, -5, 1.4, 1.4); ctx.fill(); ell(ctx, 13, 5, 1.4, 1.4); ctx.fill();
  ctx.fillStyle = `rgba(90,255,150,${0.5 + 0.5 * Math.sin(t * 6)})`; ell(ctx, -4, 0, 1.4, 1.4); ctx.fill();
  ctx.restore();
}
export function drawPanzerwagen(ctx, col, face, t) {
  ctx.save(); ctx.rotate(face);
  shadow(ctx, 19, 13, 0.45, 3, 4);
  ctx.fillStyle = '#121412';
  for (const x of [-11, 0, 11]) for (const s of [-1, 1]) { rr(ctx, x - 3.5, s * 10 - 2.5, 7, 5, 2); ctx.fill(); }
  ctx.fillStyle = '#3f4d3e';
  ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(12, -9); ctx.lineTo(18, -4); ctx.lineTo(18, 4); ctx.lineTo(12, 9); ctx.lineTo(-16, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade('#3f4d3e', 0.12); ctx.beginPath(); ctx.moveTo(-14, -7); ctx.lineTo(10, -7); ctx.lineTo(14, -3); ctx.lineTo(14, 3); ctx.lineTo(10, 7); ctx.lineTo(-14, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-14, -7, 3, 14);
  ctx.fillStyle = '#2c3530'; ell(ctx, 1, 0, 5.5, 5.5); ctx.fill();
  ctx.strokeStyle = '#1a1f1b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.lineTo(17, -1.5); ctx.moveTo(4, 1.5); ctx.lineTo(17, 1.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,245,200,0.9)'; ell(ctx, 17.5, -6, 1.3, 1.3); ctx.fill(); ell(ctx, 17.5, 6, 1.3, 1.3); ctx.fill();
  ctx.fillStyle = `rgba(90,255,150,${0.5 + 0.5 * Math.sin(t * 6)})`; ell(ctx, -7, 0, 1.3, 1.3); ctx.fill();
  ctx.restore();
}
export function drawSchiff(ctx, col, face, t, flying) {
  ctx.save();
  const h = flying ? 14 : 2;
  ctx.save(); ctx.translate(h * 0.9, h * 1.3); ctx.rotate(face); ctx.globalAlpha = flying ? 0.35 : 0.5; ctx.fillStyle = '#000';
  shipShape(ctx); ctx.fill(); ctx.restore();
  ctx.rotate(face);
  if (flying) { const g = ctx.createRadialGradient(-20, 0, 0, -20, 0, 14); g.addColorStop(0, 'rgba(130,200,255,0.85)'); g.addColorStop(1, 'rgba(60,120,255,0)'); ctx.fillStyle = g; ell(ctx, -22, -9, 10, 5); ctx.fill(); ell(ctx, -22, 9, 10, 5); ctx.fill(); }
  ctx.fillStyle = '#4a5560'; shipShape(ctx); ctx.fill();
  ctx.fillStyle = '#5e6a75'; ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(18, -3); ctx.lineTo(24, 0); ctx.lineTo(18, 3); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a3036'; rr(ctx, -20, -13, 9, 6, 2); ctx.fill(); rr(ctx, -20, 7, 9, 6, 2); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-6, -14, 3, 5); ctx.fillRect(-6, 9, 3, 5);
  ctx.fillStyle = 'rgba(140,200,230,0.85)'; ctx.beginPath(); ctx.moveTo(15, -2.4); ctx.lineTo(21.5, 0); ctx.lineTo(15, 2.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-10, 4); ctx.moveTo(4, -3.5); ctx.lineTo(4, 3.5); ctx.stroke();
  const blink = (Math.sin(t * 4) > 0.6);
  ctx.fillStyle = blink ? '#ff4a3a' : '#5a1a14'; ell(ctx, -4, -21, 1.3, 1.3); ctx.fill();
  ctx.fillStyle = blink ? '#5aff7a' : '#1a4a24'; ell(ctx, -4, 21, 1.3, 1.3); ctx.fill();
  if (!flying) { ctx.fillStyle = 'rgba(255,220,120,0.35)'; ctx.fillRect(-18, -2, 5, 4); }
  ctx.restore();
}
function shipShape(ctx) {
  ctx.beginPath();
  ctx.moveTo(24, 0); ctx.lineTo(16, -5); ctx.lineTo(2, -6); ctx.lineTo(-4, -22); ctx.lineTo(-10, -22); ctx.lineTo(-12, -7); ctx.lineTo(-22, -6);
  ctx.lineTo(-22, 6); ctx.lineTo(-12, 7); ctx.lineTo(-10, 22); ctx.lineTo(-4, 22); ctx.lineTo(2, 6); ctx.lineTo(16, 5); ctx.closePath();
}

// ---------- Die Brut ----------
const XB = '#0e1016', XM = '#1d2230', XH = '#7b86b0';
function sheen(ctx, x, y, rx, ry, rot = 0, a = 0.5) {
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, rgba(XH, a)); g.addColorStop(0.5, rgba(XM, 0.2)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ell(ctx, x, y, rx, ry, rot); ctx.fill();
}
function tail(ctx, len, w, t, sway = 1) {
  ctx.strokeStyle = XB; ctx.lineCap = 'round';
  const pts = [];
  for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([-len * k, Math.sin(t * 2.2 + k * 3) * 4 * k * sway]); }
  for (let i = 0; i < 8; i++) { ctx.lineWidth = w * (1 - i / 9); ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke(); }
  const [ex, ey] = pts[8];
  ctx.fillStyle = '#20263a'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 6, ey - 2.5); ctx.lineTo(ex - 3, ey); ctx.lineTo(ex - 6, ey + 2.5); ctx.closePath(); ctx.fill();
}
function limb(ctx, x0, y0, x1, y1, x2, y2, w = 1.6) {
  ctx.strokeStyle = XB; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = 'rgba(123,134,176,0.35)'; ctx.lineWidth = w * 0.35; ctx.stroke();
}
function rim(ctx, a = 0.55) { ctx.shadowColor = `rgba(170,140,255,${a})`; ctx.shadowBlur = 6; }
export function drawXeno(ctx, type, face, t, s = 1) {
  ctx.save(); ctx.rotate(face); ctx.scale(s, s);
  const step = Math.sin(t * 9) * 2;
  if (type === 'ei') {
    ctx.rotate(-face);
    shadow(ctx, 9, 7, 0.5, 2, 3);
    const pulse = 1 + Math.sin(t * 2) * 0.03;
    ctx.scale(pulse, pulse);
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11); g.addColorStop(0, '#6a5a4a'); g.addColorStop(0.6, '#3a2e26'); g.addColorStop(1, '#1a1410');
    ctx.fillStyle = g; ell(ctx, 0, 0, 8.5, 9.5); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,10,0.8)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 3, Math.sin(a) * 3 - 1, Math.cos(a) * 5.5, Math.sin(a) * 5.5); ctx.stroke(); }
    ctx.fillStyle = 'rgba(170,190,120,0.25)'; ell(ctx, -2.5, -3.5, 2.5, 1.6, -0.5); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'knoten') {
    ctx.rotate(-face);
    const pulse = 1 + Math.sin(t * 1.6) * 0.04;
    const ao = ctx.createRadialGradient(2, 4, 4, 2, 4, 26); ao.addColorStop(0, 'rgba(0,0,0,0.6)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ao; ell(ctx, 2, 4, 26, 20); ctx.fill();
    ctx.scale(pulse, pulse);
    // Wurzeln
    ctx.strokeStyle = XB; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3; ctx.lineWidth = 3.5 - (i % 3); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 7); ctx.quadraticCurveTo(Math.cos(a + 0.4) * 16, Math.sin(a + 0.4) * 13, Math.cos(a) * 22, Math.sin(a) * 18); ctx.stroke(); }
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 15); g.addColorStop(0, '#3a3450'); g.addColorStop(0.6, '#1a1626'); g.addColorStop(1, '#0a0810');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU, rr = 13 + Math.sin(a * 3 + 1) * 2.5; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(123,134,176,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 3); ctx.quadraticCurveTo(Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 8, Math.cos(a) * 12, Math.sin(a) * 10); ctx.stroke(); }
    const core = 0.5 + 0.5 * Math.sin(t * 2.4);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 7); cg.addColorStop(0, `rgba(200,160,255,${0.55 + 0.35 * core})`); cg.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = cg; ell(ctx, 0, 0, 7, 6); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'klammerer') {
    shadow(ctx, 9, 7, 0.45, 2, 3);
    tail(ctx, 14, 2.2, t, 1.5);
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
      const a = (-0.9 + i * 0.55) * sd, k = Math.sin(t * 14 + i) * 0.15;
      limb(ctx, 0, 0, Math.cos(a + k) * 6, Math.sin(a + k) * 7 * sd * sd, Math.cos(a + k) * 9 + 3, Math.sin(a + k) * 10, 1.4);
    }
    ctx.fillStyle = '#a89470'; ell(ctx, 0, 0, 4.6, 3.8); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.25)'; ell(ctx, -1, -1, 2, 1.4); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'brutling') {
    shadow(ctx, 7, 4, 0.4, 1.5, 2);
    ctx.strokeStyle = '#c8a088'; ctx.lineCap = 'round'; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-2, Math.sin(t * 8) * 3, -8, 0); ctx.stroke();
    ctx.fillStyle = '#d9b49c'; ell(ctx, 5, 0, 3.4, 2.6); ctx.fill();
    ctx.fillStyle = '#5a1a14'; ctx.fillRect(7, -0.6, 2, 1.2);
    ctx.restore(); return;
  }
  const big = type === 'brecher' ? 1.35 : type === 'mutter' ? 2.0 : 1;
  ctx.scale(big, big);
  shadow(ctx, 13, 8, 0.5, 2, 3);
  rim(ctx, type === 'mutter' ? 0.8 : 0.55);
  if (type === 'spucker') {
    tail(ctx, 16, 2.4, t);
    for (const sd of [-1, 1]) { limb(ctx, 4, sd * 2, 7 + step * sd, sd * 7, 11, sd * 6, 1.7); limb(ctx, -5, sd * 2, -7 - step * sd, sd * 8, -11, sd * 7, 1.7); }
    ctx.fillStyle = XB; ell(ctx, -2, 0, 7, 4); ctx.fill();
    ctx.shadowBlur = 0;
    const sac = 0.5 + 0.5 * Math.sin(t * 3);
    for (const sd of [-1, 1]) { const g = ctx.createRadialGradient(-3, sd * 3.5, 0, -3, sd * 3.5, 4); g.addColorStop(0, `rgba(190,255,90,${0.7 + 0.3 * sac})`); g.addColorStop(1, 'rgba(60,120,20,0.2)'); ctx.fillStyle = g; ell(ctx, -3, sd * 3.5, 3.6, 2.6); ctx.fill(); }
    rim(ctx, 0.5);
    ctx.fillStyle = XB; ctx.beginPath(); ctx.moveTo(3, -2.6); ctx.quadraticCurveTo(13, -3.5, 14, 0); ctx.quadraticCurveTo(13, 3.5, 3, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(190,255,90,${0.5 + 0.5 * sac})`; ell(ctx, 14.5, 0, 1.4, 1); ctx.fill();
  } else if (type === 'laeufer') {
    tail(ctx, 20, 2.6, t);
    for (const sd of [-1, 1]) { limb(ctx, 4, sd * 2, 7 + step * sd, sd * 7, 11, sd * 6, 1.8); limb(ctx, -5, sd * 2, -7 - step * sd, sd * 8, -11, sd * 7, 1.8); }
    ctx.fillStyle = XB; ell(ctx, -1, 0, 8, 3.6); ctx.fill();
    ctx.fillStyle = XB; ell(ctx, 9, 0, 6, 3); ctx.fill();
  } else {
    tail(ctx, type === 'mutter' ? 22 : 18, 3, t, 0.8);
    // Arme und Beine
    for (const sd of [-1, 1]) { limb(ctx, 2, sd * 3, 6, sd * (8 + step * sd), 11, sd * 6, 1.8); limb(ctx, -4, sd * 3, -3 - step * sd, sd * 9, 2, sd * 11, 2); }
    if (type === 'mutter') for (const sd of [-1, 1]) limb(ctx, 4, sd * 2, 7, sd * 6, 12, sd * 3, 1.5);
    ctx.fillStyle = XB; ell(ctx, -1, 0, 7, 4.2); ctx.fill();
    // Rückenrohre
    ctx.strokeStyle = XB; ctx.lineWidth = 1.6;
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-1 - i * 3, sd * 2); ctx.lineTo(-6 - i * 3, sd * 6); ctx.stroke(); }
    // Kopf: langgezogen
    ctx.fillStyle = XB; ctx.beginPath(); ctx.moveTo(4, -3); ctx.quadraticCurveTo(16, -4, 17, 0); ctx.quadraticCurveTo(16, 4, 4, 3); ctx.closePath(); ctx.fill();
    if (type === 'brecher' || type === 'mutter') {
      ctx.fillStyle = '#151a26'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -9); ctx.lineTo(-8, -7); ctx.lineTo(-6, 0); ctx.lineTo(-8, 7); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  sheen(ctx, 10, -1, 6, 2.6, 0, 0.6);
  sheen(ctx, -1, -1, 6, 3, 0, 0.35);
  ctx.fillStyle = 'rgba(210,220,255,0.35)'; ell(ctx, 12, -1.2, 2.5, 0.8); ctx.fill();
  ctx.restore();
}

// ---------- Bauten ----------
function plate(ctx, w, h, col = '#545a60') {
  const ao = ctx.createRadialGradient(4, 6, Math.min(w, h) * 0.3, 4, 6, Math.max(w, h) * 0.75);
  ao.addColorStop(0, 'rgba(0,0,0,0.55)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ao; ell(ctx, 4, 6, w * 0.75, h * 0.75); ctx.fill();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, shade(col, 0.18)); g.addColorStop(1, shade(col, -0.28));
  ctx.fillStyle = g; rr(ctx, -w / 2, -h / 2, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; rr(ctx, -w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, h / 2); ctx.lineTo(w / 2 - 3, h / 2); ctx.lineTo(w / 2, h / 2 - 3); ctx.stroke();
}
function lamp(ctx, x, y, col, t, ph = 0) { const a = 0.55 + 0.45 * Math.sin(t * 3 + ph); ctx.fillStyle = rgba(col, a); ell(ctx, x, y, 1.6, 1.6); ctx.fill(); ctx.fillStyle = rgba(col, a * 0.25); ell(ctx, x, y, 4, 4); ctx.fill(); }

export function drawBuilding(ctx, type, col, t, b = {}) {
  ctx.save();
  switch (type) {
    case 'zentrale': {
      plate(ctx, 54, 46, '#4d545b');
      { const g = ctx.createLinearGradient(-20, -16, 8, 16); g.addColorStop(0, '#7a838b'); g.addColorStop(1, '#4a5157'); ctx.fillStyle = g; rr(ctx, -20, -16, 28, 32, 3); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (const [x, y] of [[-14, 0], [-6, 4], [2, -2]]) { rr(ctx, x, y, 5, 5, 1); ctx.fill(); }
      ctx.fillStyle = '#3a4046'; rr(ctx, 10, -18, 14, 14, 2); ctx.fill(); rr(ctx, 10, 4, 14, 14, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, 10, -18, 14, 4, 2); ctx.fill(); rr(ctx, 10, 4, 14, 4, 2); ctx.fill();
      ctx.save(); ctx.translate(17, 11); ctx.rotate(t * 3); ctx.fillStyle = '#23282c'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(0, -1, 5, 2); } ctx.restore();
      ctx.fillStyle = 'rgba(255,200,120,0.75)'; for (let i = 0; i < 4; i++) ctx.fillRect(-17 + i * 6, -13, 3.5, 2.5);
      ctx.fillStyle = col; ctx.fillRect(-20, 12, 28, 4);
      ctx.strokeStyle = '#9aa2a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(17, -11); ctx.lineTo(17, -26); ctx.stroke();
      ctx.beginPath(); ctx.arc(17, -26, 5, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      lamp(ctx, 17, -26, '#ff5a3a', t);
      lamp(ctx, -24, -20, '#ffd27a', t, 1); lamp(ctx, -24, 20, '#ffd27a', t, 2);
      break;
    }
    case 'wohnmodul': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 3, 4, 18, 13); ctx.fill();
      const g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#7a8288'); g.addColorStop(1, '#40464c');
      ctx.fillStyle = g; rr(ctx, -18, -11, 36, 22, 11); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; for (const x of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(x, -11); ctx.lineTo(x, 11); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,205,130,0.8)'; for (const x of [-13, -4, 4, 12]) ctx.fillRect(x, -2, 2.5, 4);
      ctx.fillStyle = col; ctx.fillRect(-18, 8, 6, 3);
      break;
    }
    case 'werkstatt': {
      plate(ctx, 50, 40, '#505650');
      ctx.fillStyle = '#62675f'; ctx.beginPath(); ctx.moveTo(-22, -17); ctx.lineTo(22, -17); ctx.lineTo(22, 17); ctx.lineTo(-22, 17); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; for (let x = -18; x < 22; x += 6) { ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x, 17); ctx.stroke(); }
      stripes(ctx, 14, -12, 8, 24, 4);
      ctx.fillStyle = col; ctx.fillRect(-22, -17, 4, 34);
      lamp(ctx, 18, -15, '#ffb030', t);
      break;
    }
    case 'kranken': case 'sanizelt': {
      if (type === 'sanizelt') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 3, 4, 17, 14); ctx.fill(); ctx.fillStyle = '#6d7a62'; ctx.beginPath(); ctx.moveTo(-17, -12); ctx.lineTo(17, -12); ctx.lineTo(19, 12); ctx.lineTo(-19, 12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke(); }
      else { plate(ctx, 38, 30, '#cfd6d8'); ctx.fillStyle = '#e8eef0'; rr(ctx, -15, -11, 30, 22, 3); ctx.fill(); }
      ctx.fillStyle = '#e8f2f4'; ell(ctx, 0, 0, 7.5, 7.5); ctx.fill();
      ctx.fillStyle = '#2a9ad8'; ctx.fillRect(-1.6, -5, 3.2, 10); ctx.fillRect(-5, -1.6, 10, 3.2);
      ctx.fillStyle = col; ctx.fillRect(-15, 9, 30, 2.5);
      break;
    }
    case 'geschuetz': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 2, 3, 12, 10); ctx.fill();
      ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.stroke(); }
      ctx.save(); ctx.rotate(b.aim ?? 0);
      ctx.fillStyle = '#4a4f54'; rr(ctx, -6, -6, 12, 12, 3); ctx.fill();
      ctx.strokeStyle = '#1a1c1e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(16, -2); ctx.moveTo(4, 2); ctx.lineTo(16, 2); ctx.stroke();
      ctx.fillStyle = '#ff3a2a'; ell(ctx, 3, 0, 1.3, 1.3); ctx.fill();
      ctx.restore();
      ctx.fillStyle = col; ell(ctx, -3, 3, 2, 2); ctx.fill();
      break;
    }
    case 'flutlicht': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 2, 3, 8, 7); ctx.fill();
      ctx.fillStyle = '#3a3e42'; ell(ctx, 0, 0, 6, 6); ctx.fill();
      ctx.fillStyle = '#5a6066'; rr(ctx, -5, -9, 10, 6, 1); ctx.fill();
      ctx.fillStyle = '#fff6d8'; ctx.fillRect(-4, -8, 8, 4);
      ctx.fillStyle = col; ell(ctx, 0, 2, 2, 2); ctx.fill();
      break;
    }
    case 'sensor': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 2, 3, 9, 8); ctx.fill();
      ctx.strokeStyle = '#8a9298'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(0, -10); ctx.lineTo(6, 6); ctx.moveTo(-4, 1); ctx.lineTo(4, 1); ctx.stroke();
      ctx.save(); ctx.translate(0, -10); ctx.rotate(t * 1.5); ctx.fillStyle = '#9aa2a8'; ctx.fillRect(-7, -1, 14, 2); ctx.restore();
      lamp(ctx, 0, -10, '#5aff96', t);
      ctx.fillStyle = col; ell(ctx, 0, 6, 2, 2); ctx.fill();
      break;
    }
    case 'schott': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, -15, -6, 32, 14, 2); ctx.fill();
      ctx.fillStyle = '#5a5e62'; rr(ctx, -16, -8, 32, 14, 2); ctx.fill();
      stripes(ctx, -16, -8, 32, 4, 6);
      ctx.fillStyle = col; ctx.fillRect(-16, 4, 32, 2);
      break;
    }
    case 'depot': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 3, 4, 16, 12); ctx.fill();
      const box = (x, y, w, h, c) => { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, shade(c, 0.2)); g.addColorStop(1, shade(c, -0.3)); ctx.fillStyle = g; rr(ctx, x, y, w, h, 1.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke(); ctx.fillStyle = '#e8c860'; ctx.fillRect(x + 1.5, y + 1.5, 3, 1.5); };
      box(-12, -8, 11, 8, '#5a6a44'); box(0, -9, 11, 8, '#56643f'); box(-7, 1, 13, 9, '#4e5c3a');
      ctx.fillStyle = col; ctx.fillRect(-7, 8, 13, 2);
      break;
    }
    case 'wachturm': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(ctx, 10, 12, 14, 9); ctx.fill();
      ctx.strokeStyle = '#4a4e52'; ctx.lineWidth = 2;
      for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x * 0.5 + 6, y * 0.5 + 8); ctx.stroke(); }
      ctx.strokeStyle = '#33373a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
      const g = ctx.createLinearGradient(-10, -10, 10, 10); g.addColorStop(0, '#7a8288'); g.addColorStop(1, '#3e4448');
      ctx.fillStyle = g; rr(ctx, -10, -12, 20, 18, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,140,0.75)'; ctx.fillRect(-7, -9, 14, 3);
      ctx.fillStyle = col; ctx.fillRect(-10, 4, 20, 2);
      ctx.save(); ctx.translate(0, -12); ctx.rotate(Math.sin(t * 0.7) * 0.8);
      ctx.fillStyle = '#2a2e32'; rr(ctx, -3, -4, 6, 6, 1); ctx.fill();
      ctx.fillStyle = '#fff6d8'; ctx.fillRect(-2.5, -5, 5, 1.6);
      ctx.restore();
      break;
    }
    case 'fob': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ell(ctx, 3, 4, 26, 20); ctx.fill();
      ctx.strokeStyle = '#6b6248'; ctx.lineWidth = 5; ell(ctx, 0, 0, 22, 17); ctx.stroke();
      ctx.strokeStyle = '#857a5a'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ell(ctx, 0, 0, 22, 17); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#4e5a44'; ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(4, -9); ctx.lineTo(6, 3); ctx.lineTo(-14, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3c4634'; ctx.fillRect(-14, 0, 20, 3);
      ctx.fillStyle = '#6a5a3a'; rr(ctx, 6, 2, 7, 6, 1); ctx.fill(); rr(ctx, 9, -6, 6, 6, 1); ctx.fill();
      ctx.strokeStyle = '#9aa2a8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-14, -14); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-6, -12); ctx.lineTo(-14, -10); ctx.fill();
      lamp(ctx, -14, -14, '#ff5a3a', t);
      break;
    }
  }
  ctx.restore();
}
export function drawScaffold(ctx, k) {
  ctx.save();
  ctx.strokeStyle = 'rgba(232,179,32,0.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
  rr(ctx, -16, -14, 32, 28, 3); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(16, 14); ctx.moveTo(16, -14); ctx.lineTo(-16, 14); ctx.stroke();
  ctx.restore();
}

// ---------- Schlüsselorte ----------
export function drawSite(ctx, type, t) {
  ctx.save();
  if (type === 'prozessor') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ell(ctx, 6, 8, 40, 34); ctx.fill();
    const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 38); g.addColorStop(0, '#7a7f84'); g.addColorStop(1, '#2e3236');
    ctx.fillStyle = g; ell(ctx, 0, 0, 36, 32); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ell(ctx, 0, 0, 26, 23); ctx.stroke(); ell(ctx, 0, 0, 15, 13); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.fillStyle = '#3a3e42'; ell(ctx, Math.cos(a) * 30, Math.sin(a) * 27, 4, 4); ctx.fill(); }
    ctx.fillStyle = '#1c1e20'; ell(ctx, 0, 0, 9, 8); ctx.fill();
    for (let i = 0; i < 5; i++) { const k = ((t * 0.25 + i / 5) % 1); ctx.fillStyle = `rgba(200,200,200,${0.22 * (1 - k)})`; ell(ctx, k * 18, -k * 26, 6 + k * 14, 5 + k * 10); ctx.fill(); }
    for (let i = 0; i < 4; i++) lamp(ctx, Math.cos(i * TAU / 4 + 0.4) * 34, Math.sin(i * TAU / 4 + 0.4) * 30, '#ff8a2a', t, i);
  } else if (type === 'funkmast') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 4, 6, 18, 15); ctx.fill();
    ctx.fillStyle = '#4a5056'; rr(ctx, -12, -10, 24, 20, 3); ctx.fill();
    ctx.strokeStyle = '#a0a8ae'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(0, -24); ctx.lineTo(9, 8); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.moveTo(-6, -2); ctx.lineTo(3, -12); ctx.moveTo(6, -2); ctx.lineTo(-3, -12); ctx.stroke();
    ctx.fillStyle = '#c8ced2'; ctx.save(); ctx.translate(8, 2); ctx.rotate(-0.6); ell(ctx, 0, 0, 7, 4); ctx.fill(); ctx.restore();
    lamp(ctx, 0, -24, '#ff3a2a', t * 1.5);
  } else if (type === 'labor') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 4, 6, 22, 18); ctx.fill();
    ctx.fillStyle = '#585f66'; rr(ctx, -20, -14, 40, 28, 5); ctx.fill();
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 13); g.addColorStop(0, 'rgba(190,230,240,0.9)'); g.addColorStop(1, 'rgba(60,110,130,0.9)');
    ctx.fillStyle = g; ell(ctx, -3, 0, 12, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(30,50,60,0.6)'; ctx.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-3 + i * 4, -10); ctx.lineTo(-3 + i * 4, 10); ctx.stroke(); }
    ctx.fillStyle = '#3a4046'; rr(ctx, 11, -10, 7, 20, 2); ctx.fill();
    lamp(ctx, 14, -7, '#5aff96', t); lamp(ctx, 14, 7, '#ffd27a', t, 1.5);
  } else if (type === 'mine') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(ctx, 4, 6, 22, 18); ctx.fill();
    ctx.fillStyle = '#5a4a3a'; ell(ctx, 8, 8, 12, 8); ctx.fill(); ctx.fillStyle = '#7a6448'; ell(ctx, 6, 6, 8, 5); ctx.fill();
    ctx.fillStyle = '#9a8a6a'; for (let i = 0; i < 6; i++) { ell(ctx, 2 + (i * 7) % 12, 4 + (i * 5) % 7, 1.5, 1.2); ctx.fill(); }
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-8, -16); ctx.lineTo(-2, 10); ctx.moveTo(-12, 0); ctx.lineTo(-4, 0); ctx.stroke();
    ctx.save(); ctx.translate(-8, -16); ctx.rotate(t * 2); ctx.strokeStyle = '#c0b090'; ctx.lineWidth = 1.5; ell(ctx, 0, 0, 5, 5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke(); ctx.restore();
    stripes(ctx, -18, 12, 14, 4, 3);
    lamp(ctx, -8, -16, '#ffb030', t);
  }
  ctx.restore();
}

export function drawVent(ctx, sealed, t, known = true) {
  ctx.save();
  ctx.rotate(0.35);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, -9, -9, 18, 18, 2); ctx.fill();
  ctx.fillStyle = '#3e4246'; rr(ctx, -8, -8, 16, 16, 2); ctx.fill();
  ctx.fillStyle = '#0a0b0c'; for (let i = -6; i <= 4; i += 3.4) ctx.fillRect(-6, i, 12, 1.8);
  ctx.fillStyle = '#6a6e72'; for (const [x, y] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) { ell(ctx, x, y, 0.9, 0.9); ctx.fill(); }
  if (sealed) {
    ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = 1.6; ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 4;
    rr(ctx, -8, -8, 16, 16, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (known) {
    ctx.fillStyle = `rgba(150,170,190,${0.05 + 0.05 * Math.sin(t * 2)})`; rr(ctx, -8, -8, 16, 16, 2); ctx.fill();
  }
  ctx.restore();
}

// Kleine Vorschau für Panel und Kaufkarten
export function iconCanvas(kind, type, col, w = 60, h = 45) {
  const cv = document.createElement('canvas'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2a2e'); g.addColorStop(1, '#141418'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  const s = Math.min(w / 60, h / 45) * (kind === 'bld' ? 0.75 : 1.15);
  ctx.scale(s, s);
  drawThing(ctx, kind, type, col, -0.4, 1.3);
  return cv;
}
export function drawThing(ctx, kind, type, col, face, t, extra = {}) {
  if (kind === 'bld') return drawBuilding(ctx, type, col, t, extra);
  if (kind === 'site') return drawSite(ctx, type, t);
  if (['ei', 'klammerer', 'brutling', 'laeufer', 'jaeger', 'brecher', 'mutter', 'spucker', 'knoten'].includes(type)) return drawXeno(ctx, type, face, t);
  if (type === 'lademech') return drawLademech(ctx, col, face, t);
  if (type === 'schlepper') return drawSchlepper(ctx, col, face, t);
  if (type === 'panzerwagen') return drawPanzerwagen(ctx, col, face, t);
  if (type === 'schiff') return drawSchiff(ctx, col, face, t, extra.flying);
  return drawInfantry(ctx, type, col, ['schuetze', 'unteroff', 'smartgun', 'pionier', 'sani', 'flammer'].includes(type), face, t);
}
