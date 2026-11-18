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
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Rucksack bzw. Tank
  if (kit === 'flamer') {
    const g = ctx.createLinearGradient(-10, -4, -4, 4); g.addColorStop(0, '#9a3a20'); g.addColorStop(1, '#4a1a10');
    ctx.fillStyle = g; rr(ctx, -10, -4.5, 6, 9, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-9, -3.5); ctx.lineTo(-9, 3.5); ctx.stroke();
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.quadraticCurveTo(-1, 6, 3, 3); ctx.stroke();
  } else {
    ctx.fillStyle = shade(armor, -0.35); rr(ctx, -8, -3.8, 4.4, 7.6, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-7.6, -3.4, 3.6, 1.2);
    if (kit === 'tracker') { ctx.strokeStyle = '#2a2e2a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-11, -6); ctx.stroke(); ctx.fillStyle = `rgba(255,80,60,${0.5 + 0.5 * Math.sin(t * 5)})`; ell(ctx, -11, -6, 0.7, 0.7); ctx.fill(); }
  }
  // Waffe
  const gun = (x0, x1, y, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); };
  if (kit === 'flamer') { gun(1, 12, 2, 2.6, '#2a2a2a'); ctx.fillStyle = `rgba(255,${130 + 60 * Math.sin(t * 20)},40,0.9)`; ell(ctx, 12.8, 2, 1.4, 1.4); ctx.fill(); }
  else if (kit === 'tube') { gun(-6, 12, -3, 4.2, '#4a4f3a'); gun(10.5, 12.5, -3, 4.8, '#2a2d22'); }
  else if (kit === 'smart') {
    gun(-1, 14, 4, 3.6, '#1e2420'); gun(10, 14, 4, 1.4, '#555');
    ctx.strokeStyle = '#59614e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(2, 0, 0, 6); ctx.stroke();
    ctx.fillStyle = '#ff4030'; ell(ctx, 4, -4, 1.1, 1.1); ctx.fill();
  } else if (kit === 'pulse') { gun(1, 12, 3, 2.8, '#1b211c'); gun(9, 12, 3, 1.2, '#4a524a'); ctx.fillStyle = '#2a302a'; ctx.fillRect(4, 3.5, 2.5, 2); }
  else if (kit === 'torch') { gun(1, 8, 3, 2.3, '#2b2622'); ctx.fillStyle = `rgba(150,220,255,${0.5 + 0.5 * Math.sin(t * 20)})`; ell(ctx, 9, 3, 1.5, 1.5); ctx.fill(); }
  else if (kit !== 'med') gun(1, 12, 3, 2.2, '#2b2622');
  // Arme
  ctx.strokeStyle = shade(armor, -0.1); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(0, -4.5); ctx.quadraticCurveTo(4, -2, kit === 'tube' ? 5 : 6, kit === 'tube' ? -3 : 2.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 4.8); ctx.quadraticCurveTo(2, 4.5, 3.5, kit === 'tube' ? -2.5 : 3.2); ctx.stroke();
  // Rumpf
  const bg = ctx.createLinearGradient(-5, -6, 4, 6); bg.addColorStop(0, shade(armor, 0.25)); bg.addColorStop(1, shade(armor, -0.3));
  ctx.fillStyle = bg; ell(ctx, 0, 0, 5, 6.6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 0.7; ell(ctx, 0, 0, 5, 6.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(1.5, -5); ctx.lineTo(1.5, 5); ctx.stroke();
  ctx.fillStyle = shade(col, -0.25); ell(ctx, -0.3, -5, 1.9, 1.4); ctx.fill(); ell(ctx, -0.3, 5, 1.9, 1.4); ctx.fill();
  if (kit === 'tracker') { ctx.fillStyle = '#0b1a10'; rr(ctx, 2.2, -3.6, 4.6, 4, 1); ctx.fill(); ctx.fillStyle = `rgba(90,255,150,${0.6 + 0.4 * Math.sin(t * 6)})`; ell(ctx, 4.5, -1.6, 1.2, 1.2); ctx.fill(); }
  if (kit === 'med') { ctx.fillStyle = '#e8eef0'; rr(ctx, -6, -3, 5, 6, 1); ctx.fill(); ctx.fillStyle = '#3aa0e0'; ctx.fillRect(-4.2, -2, 1.4, 4); ctx.fillRect(-5.3, -0.7, 3.6, 1.4); ctx.fillStyle = '#e8eef0'; ctx.fillRect(-1.5, 4.4, 2.4, 1.6); }
  // Helm
  ctx.fillStyle = skin; ell(ctx, 0.5, 0, 3.6, 3.4); ctx.fill();
  const hg = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 3.6); hg.addColorStop(0, marine ? '#7a8a70' : '#d0a040'); hg.addColorStop(1, marine ? '#3e4a38' : '#7a5a1a');
  ctx.fillStyle = hg; ell(ctx, 0, 0, 3.4, 3.2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.5; ell(ctx, 0, 0, 3.4, 3.2); ctx.stroke();
  if (marine) {
    ctx.fillStyle = 'rgba(20,26,30,0.9)'; ctx.beginPath(); ctx.ellipse(1.6, 0, 1.6, 2.6, 0, -1.3, 1.3); ctx.fill();
    ctx.fillStyle = 'rgba(150,200,230,0.5)'; ell(ctx, 2.2, -0.9, 0.5, 0.8); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-2.6, -0.5, 2.2, 1);
  } else {
    // Bergbauhelm mit Stirnlampe
    ctx.fillStyle = col; ctx.fillRect(-0.5, -3.1, 1, 6.2);
    ctx.fillStyle = '#fff6d0'; ell(ctx, 3.2, 0, 0.9, 1.1); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -1.1, -1.2, 1.2, 0.9); ctx.fill();
  void lead;
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
  // Hydraulik und Käfig
  ctx.strokeStyle = '#9aa0a4'; ctx.lineWidth = 1.2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, sd * 5); ctx.lineTo(8, sd * 8); ctx.stroke(); }
  ctx.strokeStyle = '#1d1a14'; ctx.lineWidth = 1; rr(ctx, -5, -5, 9, 10, 2); ctx.stroke();
  ctx.fillStyle = '#3a342c'; for (const [x, y] of [[-8, -6], [-8, 5], [4, -6], [4, 5]]) { ctx.fillRect(x, y, 2, 1.5); }
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
  ctx.fillStyle = '#5a4a32'; rr(ctx, -11, -5, 5, 4, 1); ctx.fill(); ctx.fillStyle = '#4a5a6a'; rr(ctx, -5, -5.5, 6, 5, 1); ctx.fill(); ctx.fillStyle = '#6a5a3a'; rr(ctx, -10, 1, 7, 4.5, 1); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-8.5, -5); ctx.lineTo(-8.5, -1); ctx.moveTo(-2, -5.5); ctx.lineTo(-2, -0.5); ctx.stroke();
  ctx.fillStyle = '#2a2826'; ell(ctx, -13, -8, 1.4, 1.4); ctx.fill();
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
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -12, -5, 6, 4, 1); ctx.fill(); rr(ctx, -12, 1, 6, 4, 1); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-14, -7); ctx.lineTo(10, -7); ctx.stroke();
  ctx.strokeStyle = '#9aa0a4'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-17, 10); ctx.stroke();
  ctx.fillStyle = '#2c3530'; ell(ctx, 1, 0, 5.5, 5.5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(1, 0, 5.5, Math.PI, Math.PI * 1.6); ctx.stroke();
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
  ctx.fillStyle = '#3a4248'; for (const sd of [-1, 1]) { rr(ctx, 0, sd * 9 - 1.5, 9, 3, 1.2); ctx.fill(); }
  ctx.fillStyle = '#20262a'; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { ell(ctx, 9.2, sd * 9 - 1 + i, 0.5, 0.4); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-8, -16); ctx.moveTo(-3, 16); ctx.lineTo(-8, 16); ctx.moveTo(8, -4); ctx.lineTo(8, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(16, -3); ctx.lineTo(16, -1.5); ctx.lineTo(-14, -2.5); ctx.closePath(); ctx.fill();
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

// ---------- Die Brut (eigenes Design: Chitinpanzer, Sichelarme, Augenbündel, Stachelschwanz) ----------
const CH = '#15121b', CM = '#2a2333', CL = '#4a3f5c', EYE = '#ffb347';
function rim(ctx, a = 0.55) { ctx.shadowColor = `rgba(170,140,255,${a})`; ctx.shadowBlur = 6; }
function plateSeg(ctx, x, y, rx, ry, rot = 0, light = 0.35) {
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx * 0.6, y + ry);
  g.addColorStop(0, CL); g.addColorStop(0.45, CM); g.addColorStop(1, CH);
  ctx.fillStyle = g; ell(ctx, x, y, rx, ry, rot); ctx.fill();
  ctx.strokeStyle = `rgba(190,170,240,${light})`; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, Math.PI * 0.1, Math.PI * 0.85); ctx.stroke();
}
function jleg(ctx, x0, y0, kx, ky, fx, fy, w = 1.8) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = CH; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.lineWidth = w * 0.75; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.fillStyle = CM; ell(ctx, kx, ky, w * 0.7, w * 0.7); ctx.fill();
  ctx.strokeStyle = 'rgba(190,170,240,0.35)'; ctx.lineWidth = w * 0.25;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  // Dornen an den Füßen
  const a = Math.atan2(fy - ky, fx - kx);
  ctx.strokeStyle = CH; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a + 0.7) * 2.2, fy + Math.sin(a + 0.7) * 2.2); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a - 0.7) * 2.2, fy + Math.sin(a - 0.7) * 2.2); ctx.stroke();
}
function sickle(ctx, sd, t, len = 14) {
  const sw = Math.sin(t * 2.5) * 0.08;
  ctx.save(); ctx.translate(5, sd * 4); ctx.rotate(sd * (0.25 + sw));
  ctx.strokeStyle = CH; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, sd * 4); ctx.stroke();
  ctx.fillStyle = CM; ctx.beginPath(); ctx.moveTo(6, sd * 3); ctx.quadraticCurveTo(6 + len * 0.6, sd * 7, 6 + len, sd * 1); ctx.quadraticCurveTo(6 + len * 0.55, sd * 4.5, 6, sd * 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(220,210,255,0.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7, sd * 4.6); ctx.quadraticCurveTo(6 + len * 0.55, sd * 4.2, 6 + len, sd * 1); ctx.stroke();
  ctx.restore();
}
function stingTail(ctx, len, w, t, segs = 6, sway = 1) {
  const pts = [];
  for (let i = 0; i <= segs; i++) { const k = i / segs; pts.push([-len * k, Math.sin(t * 2 + k * 2.6) * 4 * k * sway]); }
  for (let i = segs - 1; i >= 0; i--) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const a = Math.atan2(y2 - y1, x2 - x1);
    plateSeg(ctx, (x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) * 0.62, w * (1 - i / (segs + 2)), a, 0.3);
  }
  const [ex, ey] = pts[segs], [px, py] = pts[segs - 1], a = Math.atan2(ey - py, ex - px);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
  ctx.fillStyle = '#3a2f46'; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.quadraticCurveTo(6, -3, 7, 2.5); ctx.quadraticCurveTo(4, 0, -1, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,120,0.5)'; ell(ctx, 6.6, 2.3, 0.6, 0.6); ctx.fill();
  ctx.restore();
}
function spikesRow(ctx, x0, x1, n, h = 2.2) {
  ctx.fillStyle = CH;
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i / (n - 1));
    ctx.beginPath(); ctx.moveTo(x - 1.2, 0); ctx.lineTo(x - 2.4, -h); ctx.lineTo(x + 0.4, -0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 1.2, 0); ctx.lineTo(x - 2.4, h); ctx.lineTo(x + 0.4, 0.4); ctx.closePath(); ctx.fill();
  }
}
function wedgeHead(ctx, x, len, wid, t, eyes = 4, mand = true) {
  if (mand) {
    const o = 0.25 + Math.max(0, Math.sin(t * 3)) * 0.25;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(x + len - 1, sd * wid * 0.45); ctx.rotate(sd * o);
      ctx.fillStyle = '#2e2638'; ctx.beginPath(); ctx.moveTo(0, -sd * 0.8); ctx.quadraticCurveTo(4, -sd * 0.2, 5.5, sd * 1.8); ctx.quadraticCurveTo(3, sd * 0.6, 0, sd * 1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  const g = ctx.createLinearGradient(x, -wid, x + len, wid); g.addColorStop(0, CL); g.addColorStop(0.5, CM); g.addColorStop(1, CH);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, -wid); ctx.quadraticCurveTo(x + len * 0.7, -wid * 0.9, x + len, -wid * 0.25); ctx.lineTo(x + len, wid * 0.25); ctx.quadraticCurveTo(x + len * 0.7, wid * 0.9, x, wid); ctx.quadraticCurveTo(x - 2, 0, x, -wid); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + 1, 0); ctx.lineTo(x + len - 1, 0); ctx.stroke();
  const glow = 0.6 + 0.4 * Math.sin(t * 4);
  const spots = eyes === 6 ? [[0.55, 0.35], [0.7, 0.28], [0.82, 0.18]] : [[0.62, 0.32], [0.78, 0.2]];
  for (const [fx, fy] of spots) for (const sd of [-1, 1]) {
    const ex = x + len * fx, ey = sd * wid * fy * 1.6;
    ctx.fillStyle = `rgba(255,170,60,${0.25 * glow})`; ell(ctx, ex, ey, 2.2, 2.2); ctx.fill();
    ctx.fillStyle = EYE; ell(ctx, ex, ey, 0.85, 0.85); ctx.fill();
  }
}

export function drawXeno(ctx, type, face, t, s = 1) {
  ctx.save(); ctx.rotate(face); ctx.scale(s, s);
  const step = Math.sin(t * 9) * 1.8;
  if (type === 'ei') {
    ctx.rotate(-face);
    shadow(ctx, 10, 7, 0.5, 2, 3);
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    ctx.scale(pulse, pulse);
    for (const [x, y, rx, ry] of [[-4, 2, 5.5, 5], [3, -1, 6.5, 7], [4, 5, 4, 3.6]]) {
      const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.5, x, y, Math.max(rx, ry));
      g.addColorStop(0, 'rgba(200,150,255,0.85)'); g.addColorStop(0.45, 'rgba(90,50,130,0.9)'); g.addColorStop(1, 'rgba(25,14,36,0.95)');
      ctx.fillStyle = g; ell(ctx, x, y, rx, ry); ctx.fill();
      ctx.strokeStyle = 'rgba(30,16,40,0.8)'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + x; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * rx * 0.5, y + Math.sin(a + 1) * ry * 0.5, x + Math.cos(a) * rx * 0.9, y + Math.sin(a) * ry * 0.9); ctx.stroke(); }
    }
    ctx.fillStyle = `rgba(230,200,255,${0.5 + 0.3 * Math.sin(t * 3)})`; ell(ctx, 3, -1, 1.6, 2.4); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'knoten') {
    ctx.rotate(-face);
    const pulse = 1 + Math.sin(t * 1.6) * 0.04;
    const ao = ctx.createRadialGradient(2, 4, 4, 2, 4, 26); ao.addColorStop(0, 'rgba(0,0,0,0.6)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ao; ell(ctx, 2, 4, 26, 20); ctx.fill();
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = CH; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3; ctx.lineWidth = 3.5 - (i % 3); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 7); ctx.quadraticCurveTo(Math.cos(a + 0.4) * 16, Math.sin(a + 0.4) * 13, Math.cos(a) * 22, Math.sin(a) * 18); ctx.stroke(); }
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 15); g.addColorStop(0, '#3a3450'); g.addColorStop(0.6, '#1a1626'); g.addColorStop(1, '#0a0810');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU, rr2 = 13 + Math.sin(a * 3 + 1) * 2.5; i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.85) : ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.85); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(123,134,176,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 3); ctx.quadraticCurveTo(Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 8, Math.cos(a) * 12, Math.sin(a) * 10); ctx.stroke(); }
    const core = 0.5 + 0.5 * Math.sin(t * 2.4);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 7); cg.addColorStop(0, `rgba(200,160,255,${0.55 + 0.35 * core})`); cg.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = cg; ell(ctx, 0, 0, 7, 6); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'klammerer') {
    // Zecke: flacher Panzer, sechs Hakenbeine, Saugrüssel
    shadow(ctx, 8, 6, 0.45, 2, 3);
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
      const bx = 2 - i * 3, k = Math.sin(t * 16 + i * 2 + sd) * 1.2;
      jleg(ctx, bx, sd * 3, bx + 1 + k, sd * 7, bx + 4 - i * 2 + k, sd * 9.5, 1.3);
    }
    const g = ctx.createRadialGradient(-2, -2, 0.5, 0, 0, 7); g.addColorStop(0, '#8a7458'); g.addColorStop(0.6, '#4a3a2c'); g.addColorStop(1, '#221a14');
    ctx.fillStyle = g; ell(ctx, -1, 0, 6.5, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,10,0.7)'; ctx.lineWidth = 0.7; for (const x of [-4, -1, 2]) { ctx.beginPath(); ctx.ellipse(x, 0, 1.5, 4.5, 0, -1.2, 1.2); ctx.stroke(); }
    ctx.fillStyle = '#2a2018'; ell(ctx, 5.5, 0, 2.2, 1.8); ctx.fill();
    ctx.strokeStyle = '#5a3a30'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(10 + Math.sin(t * 8), 0); ctx.stroke();
    ctx.fillStyle = `rgba(255,170,60,${0.6 + 0.4 * Math.sin(t * 5)})`; ell(ctx, 6, -0.9, 0.5, 0.5); ctx.fill(); ell(ctx, 6, 0.9, 0.5, 0.5); ctx.fill();
    ctx.restore(); return;
  }
  if (type === 'brutling') {
    // Larve: helle Segmente, Stummelbeine, dunkler Kopf
    shadow(ctx, 8, 4, 0.4, 1.5, 2);
    for (let i = 4; i >= 0; i--) {
      const x = -i * 2.6, y = Math.sin(t * 8 - i * 0.8) * 1.2;
      const g = ctx.createRadialGradient(x - 0.5, y - 1, 0.3, x, y, 3); g.addColorStop(0, '#e8d4c0'); g.addColorStop(1, '#9a7a68');
      ctx.fillStyle = g; ell(ctx, x, y, 2.2, 2.8 - i * 0.25); ctx.fill();
      ctx.strokeStyle = '#6a4a3a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y - 2.5); ctx.lineTo(x - 0.8, y - 3.6); ctx.moveTo(x, y + 2.5); ctx.lineTo(x - 0.8, y + 3.6); ctx.stroke();
    }
    ctx.fillStyle = '#2a1e22'; ell(ctx, 2.6, 0, 2.4, 2.2); ctx.fill();
    ctx.fillStyle = EYE; ell(ctx, 3.6, -0.9, 0.5, 0.5); ctx.fill(); ell(ctx, 3.6, 0.9, 0.5, 0.5); ctx.fill();
    ctx.restore(); return;
  }
  const big = type === 'brecher' ? 1.35 : type === 'mutter' ? 1.95 : 1;
  ctx.scale(big, big);
  shadow(ctx, 14, 9, 0.5, 2, 3);
  rim(ctx, type === 'mutter' ? 0.75 : 0.5);
  if (type === 'laeufer') {
    stingTail(ctx, 16, 2.2, t, 5);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const bx = 4 - i * 4, k = (i % 2 ? step : -step) * sd; jleg(ctx, bx, sd * 2.5, bx + 2 + k, sd * 8, bx + 5 - i * 3 + k, sd * 10.5, 1.6); }
    rim(ctx, 0.5);
    plateSeg(ctx, -4, 0, 4.5, 3.4); plateSeg(ctx, 0, 0, 4.2, 3.6); plateSeg(ctx, 4, 0, 3.6, 3.2);
    ctx.shadowBlur = 0; spikesRow(ctx, -6, 4, 4, 1.8);
    wedgeHead(ctx, 6.5, 8, 3.4, t, 4, true);
  } else if (type === 'spucker') {
    stingTail(ctx, 10, 2, t, 4, 0.6);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const bx = 4 - i * 4, k = (i % 2 ? step : -step) * sd; jleg(ctx, bx, sd * 3, bx + 1 + k, sd * 8, bx + 4 - i * 3 + k, sd * 10, 1.5); }
    // Säuresack
    const sac = 0.5 + 0.5 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(-6, -1, 1, -5, 0, 8); g.addColorStop(0, `rgba(200,255,110,${0.85})`); g.addColorStop(0.5, `rgba(90,150,30,${0.75 + 0.2 * sac})`); g.addColorStop(1, 'rgba(25,40,10,0.95)');
    ctx.fillStyle = g; ell(ctx, -5, 0, 7.5 + sac * 0.6, 5.5 + sac * 0.4); ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,10,0.7)'; ctx.lineWidth = 0.7; for (const x of [-9, -6, -3]) { ctx.beginPath(); ctx.ellipse(x, 0, 1.2, 5, 0, 0, TAU); ctx.stroke(); }
    rim(ctx, 0.45);
    plateSeg(ctx, 2, 0, 4, 3.4);
    ctx.shadowBlur = 0;
    wedgeHead(ctx, 5, 7, 3, t, 4, true);
    ctx.fillStyle = `rgba(190,255,90,${0.5 + 0.5 * sac})`; ell(ctx, 13, Math.sin(t * 2) * 0.5, 1.1, 1.1); ctx.fill();
  } else if (type === 'brecher') {
    stingTail(ctx, 11, 3, t, 4, 0.4);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const bx = 4 - i * 4.5, k = (i % 2 ? step : -step) * sd * 0.6; jleg(ctx, bx, sd * 4, bx + 2 + k, sd * 10, bx + 4 - i * 2 + k, sd * 12.5, 2.4); }
    rim(ctx, 0.5);
    // gewölbter Rückenschild
    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11); g.addColorStop(0, '#5a4c6a'); g.addColorStop(0.5, CM); g.addColorStop(1, CH);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(0, -10, -9, -7); ctx.quadraticCurveTo(-12, 0, -9, 7); ctx.quadraticCurveTo(0, 10, 8, 6); ctx.quadraticCurveTo(10, 0, 8, -6); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8; for (const x of [-5, -1, 3]) { ctx.beginPath(); ctx.moveTo(x, -8); ctx.quadraticCurveTo(x + 2, 0, x, 8); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,180,250,0.35)'; ctx.beginPath(); ctx.moveTo(6, -6); ctx.quadraticCurveTo(-1, -9.5, -8, -6.5); ctx.stroke();
    // Rammhörner
    for (const sd of [-1, 1]) { ctx.fillStyle = '#3a3048'; ctx.beginPath(); ctx.moveTo(8, sd * 3); ctx.quadraticCurveTo(14, sd * 6, 16, sd * 2); ctx.quadraticCurveTo(13, sd * 3, 9, sd * 1); ctx.closePath(); ctx.fill(); }
    wedgeHead(ctx, 8, 6, 3.6, t, 4, true);
  } else if (type === 'mutter') {
    ctx.shadowBlur = 0;
    // Eiersack hinten
    const pul = 0.5 + 0.5 * Math.sin(t * 1.5);
    const g = ctx.createRadialGradient(-14, -2, 2, -13, 0, 12); g.addColorStop(0, `rgba(170,120,220,${0.75 + 0.15 * pul})`); g.addColorStop(0.5, 'rgba(70,40,100,0.95)'); g.addColorStop(1, 'rgba(18,10,26,1)');
    ctx.fillStyle = g; ell(ctx, -13, 0, 11 + pul * 0.6, 7.5 + pul * 0.4); ctx.fill();
    ctx.strokeStyle = 'rgba(25,12,35,0.7)'; ctx.lineWidth = 0.8; for (const x of [-20, -16, -12, -8]) { ctx.beginPath(); ctx.ellipse(x, 0, 1.5, 7, 0, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 2; i++) for (const sd of [-1, 1]) { const bx = 0 - i * 4, k = (i % 2 ? step : -step) * sd * 0.5; jleg(ctx, bx, sd * 3, bx + 1 + k, sd * 9, bx + 3 + k, sd * 11.5, 1.9); }
    rim(ctx, 0.7);
    sickle(ctx, -1, t, 13); sickle(ctx, 1, t, 13);
    plateSeg(ctx, -2, 0, 5, 4); plateSeg(ctx, 2.5, 0, 4.5, 3.8);
    ctx.shadowBlur = 0; spikesRow(ctx, -5, 4, 4, 2);
    // Hörnerkrone
    ctx.fillStyle = CH;
    for (let i = 0; i < 7; i++) { const a = -1.3 + i * 0.43, x = 7 + Math.cos(a) * 3, y = Math.sin(a) * 5; ctx.beginPath(); ctx.moveTo(x, y - 0.8); ctx.lineTo(x - 5 - (i % 2) * 2, y * 1.9); ctx.lineTo(x + 0.6, y + 0.8); ctx.closePath(); ctx.fill(); }
    wedgeHead(ctx, 6, 8, 3.8, t, 6, true);
  } else {
    // Jäger
    stingTail(ctx, 17, 2.6, t, 6);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 2; i++) for (const sd of [-1, 1]) { const bx = -1 - i * 4, k = (i % 2 ? step : -step) * sd; jleg(ctx, bx, sd * 3, bx + 1 + k, sd * 9, bx + 3 - i * 2 + k, sd * 11.5, 1.8); }
    rim(ctx, 0.5);
    sickle(ctx, -1, t); sickle(ctx, 1, t);
    plateSeg(ctx, -5, 0, 4.4, 3.4); plateSeg(ctx, -1, 0, 4.4, 3.8); plateSeg(ctx, 3.2, 0, 3.8, 3.4);
    ctx.shadowBlur = 0; spikesRow(ctx, -7, 4, 5, 2.2);
    wedgeHead(ctx, 6, 9, 3.6, t, 4, true);
  }
  ctx.shadowBlur = 0;
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
