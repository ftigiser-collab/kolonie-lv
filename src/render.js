// Renderer: Kamera, Gelände, Harz, Dunkelheit, Licht, Melder-Signale, Einheiten, Effekte
import { center, hexPath, R, HW, VS, distance, corners } from './hex.js';
import { clamp, rgba, shade, Noise, mulberry32 } from './util.js';
import { TERRAIN, FACTIONS, UNITS, BUILDINGS, SITES } from './data.js';
import { drawThing, drawVent, drawScaffold, drawSite } from './sprites.js';

const TAU = Math.PI * 2;
const TRK = '#5dff9a';

export class Renderer {
  constructor(canvas, game) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.g = game;
    this.cam = { x: 0, y: 0, z: 1 };
    this.t = 0; this.shake = 0;
    this.parts = []; this.tracers = []; this.floaters = []; this.pings = []; this.rings = [];
    this.hl = { move: null, attack: [], target: [], path: null, sel: null };
    this.showVents = false;
    this.bake();
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.clampCam();
  }
  s2w(sx, sy) { return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y }; }
  clampCam() {
    const ms = this.g.map.size, z = this.cam.z, vw = this.vw / z, vh = this.vh / z;
    this.cam.x = ms.w < vw ? (ms.w - vw) / 2 : clamp(this.cam.x, -80, ms.w - vw + 80);
    this.cam.y = ms.h < vh ? (ms.h - vh) / 2 : clamp(this.cam.y, -80, ms.h - vh + 80);
  }
  zoomAt(sx, sy, f) {
    const b = this.s2w(sx, sy);
    this.cam.z = clamp(this.cam.z * f, 0.3, 2.4);
    this.cam.x = b.x - sx / this.cam.z; this.cam.y = b.y - sy / this.cam.z;
    this.clampCam();
  }
  centerOn(x, y, smooth = true) {
    const tx = x - this.vw / this.cam.z / 2, ty = y - this.vh / this.cam.z / 2;
    if (smooth) this.camTarget = { x: tx, y: ty }; else { this.camTarget = null; this.cam.x = tx; this.cam.y = ty; this.clampCam(); }
  }
  onScreen(x, y, m = 40) { const s = { x: (x - this.cam.x) * this.cam.z, y: (y - this.cam.y) * this.cam.z }; return s.x > m && s.y > m + 50 && s.x < this.vw - m && s.y < this.vh - m; }
  posOf(e) { return e.vis || center(e.c, e.r); }

  // ---------- Gelände vorberechnen ----------
  bake() {
    const g = this.g, m = g.map, { w, h } = m.size;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
    const ctx = cv.getContext('2d');
    const rnd = mulberry32(m.seed + 17), N = new Noise(m.seed + 5);
    ctx.fillStyle = '#141215'; ctx.fillRect(0, 0, w, h);
    const T = (c, r) => m.t[r * m.W + c];
    // Grundfarben
    for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) {
      const k = T(c, r), p = center(c, r), n = N.fbm(c * 0.3, r * 0.3, 3);
      ctx.fillStyle = shade(TERRAIN[k].col, (n - 0.5) * 0.35);
      ctx.beginPath(); hexPath(ctx, p.x, p.y, R + 1.2); ctx.fill();
    }
    // weiche Übergänge: Farbflecken quer über die Hexgrenzen
    for (let i = 0; i < m.W * m.H * 3; i++) {
      const c = Math.floor(rnd() * m.W), r = Math.floor(rnd() * m.H), k = T(c, r);
      if (k === 'chasm' || k === 'deck' || k === 'pad' || k === 'road') continue;
      const p = center(c, r), a = rnd() * TAU, d = rnd() * R * 1.1;
      ctx.fillStyle = rgba(TERRAIN[k].col, 0.35);
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 8 + rnd() * 16, 6 + rnd() * 10, rnd() * 3, 0, TAU); ctx.fill();
    }
    // Körnung
    const tile = document.createElement('canvas'); tile.width = tile.height = 128;
    const tc = tile.getContext('2d'), img = tc.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) { const v = rnd(); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.5 ? 255 : 0; img.data[i * 4 + 3] = Math.abs(v - 0.5) * 50; }
    tc.putImageData(img, 0, 0);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, w, h);
    // Details
    for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) {
      const k = T(c, r), p = center(c, r);
      ctx.save(); ctx.translate(p.x, p.y);
      if (k === 'dust') {
        for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(20,16,14,${0.25 + rnd() * 0.2})`; ctx.beginPath(); ctx.ellipse((rnd() - 0.5) * R * 1.4, (rnd() - 0.5) * R * 1.2, 1 + rnd() * 2, 0.8 + rnd() * 1.4, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(120,105,95,0.12)'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const y = (rnd() - 0.5) * R; ctx.beginPath(); ctx.moveTo(-R * 0.7, y); ctx.quadraticCurveTo(0, y - 3, R * 0.7, y + 2); ctx.stroke(); }
      } else if (k === 'rock' || k === 'ridge') {
        const n = k === 'ridge' ? 6 : 7, big = k === 'ridge' ? 1.8 : 1;
        for (let i = 0; i < n; i++) {
          const x = (rnd() - 0.5) * R * 1.3, y = (rnd() - 0.5) * R * 1.2, s = (3 + rnd() * 6) * big;
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; this.blob(ctx, x + 2, y + 3, s, rnd); ctx.fill();
          ctx.fillStyle = shade(TERRAIN[k].col, 0.1 + rnd() * 0.15); this.blob(ctx, x, y, s, rnd); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,220,0.08)'; this.blob(ctx, x - s * 0.25, y - s * 0.3, s * 0.5, rnd); ctx.fill();
        }
        if (k === 'ridge') { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); let x = (rnd() - 0.5) * R, y = (rnd() - 0.5) * R; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 14; y += (rnd() - 0.5) * 14; ctx.lineTo(x, y); } ctx.stroke(); } }
      } else if (k === 'chasm') {
        const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, R); gr.addColorStop(0, '#000'); gr.addColorStop(0.75, '#050406'); gr.addColorStop(1, 'rgba(30,26,30,0.6)');
        ctx.fillStyle = gr; ctx.beginPath(); hexPath(ctx, 0, 0, R * 0.95); ctx.fill();
      } else if (k === 'deck') {
        ctx.save(); ctx.beginPath(); hexPath(ctx, 0, 0, R + 1); ctx.clip();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        for (let x = -R; x <= R; x += 13) { ctx.beginPath(); ctx.moveTo(x, -R); ctx.lineTo(x, R); ctx.stroke(); }
        for (let y = -R; y <= R; y += 13) { ctx.beginPath(); ctx.moveTo(-R, y); ctx.lineTo(R, y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = -R; x <= R; x += 13) for (let y = -R; y <= R; y += 13) ctx.fillRect(x + 1.5, y + 1.5, 1.2, 1.2);
        ctx.restore();
      } else if (k === 'road') {
        ctx.strokeStyle = 'rgba(25,20,18,0.35)'; ctx.lineWidth = 3;
        for (const [x, y] of [[-6, 0], [6, 0]]) { ctx.beginPath(); ctx.moveTo(x - 4, -R * 0.8); ctx.lineTo(x + 4, R * 0.8); ctx.stroke(); }
      } else if (k === 'wreck') {
        ctx.strokeStyle = '#3a3346'; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { ctx.lineWidth = 3 + rnd() * 3; const a = rnd() * TAU; ctx.beginPath(); ctx.arc((rnd() - 0.5) * 20, (rnd() - 0.5) * 20, 12 + rnd() * 14, a, a + 1.5 + rnd()); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(160,140,200,0.12)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const a = rnd() * TAU; ctx.beginPath(); ctx.arc((rnd() - 0.5) * 20, (rnd() - 0.5) * 20, 10 + rnd() * 10, a, a + 1.2); ctx.stroke(); }
      } else if (k === 'pad') {
        ctx.strokeStyle = 'rgba(230,220,180,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(230,220,180,0.3)'; ctx.fillRect(-7, -9, 3, 18); ctx.fillRect(4, -9, 3, 18); ctx.fillRect(-4, -1.5, 8, 3);
      }
      ctx.restore();
    }
    // Wrackrumpf am Nest
    { const p = center(m.nest.c, m.nest.r); ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(8, 10, 70, 34, -0.3, 0, TAU); ctx.fill();
      ctx.rotate(-0.3);
      const gr = ctx.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, '#3d3548'); gr.addColorStop(1, '#17131e');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.bezierCurveTo(-60, -34, 40, -40, 66, -6); ctx.lineTo(50, 4); ctx.bezierCurveTo(70, 20, 0, 36, -60, 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,130,190,0.2)'; ctx.lineWidth = 2; for (let i = -50; i < 50; i += 12) { ctx.beginPath(); ctx.moveTo(i, -24); ctx.quadraticCurveTo(i + 6, 0, i, 22); ctx.stroke(); }
      ctx.fillStyle = '#07060a'; ctx.beginPath(); ctx.ellipse(-8, 4, 14, 7, 0.2, 0, TAU); ctx.fill();
      ctx.restore(); }
    // Hexgitter, sehr dezent
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
    for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) { const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, R); ctx.stroke(); }
    this.base = cv;
    // Harz-Kacheln
    this.resinTiles = [0, 1, 2].map((v) => this.makeResinTile(v));
    // Nebelpuffer
    this.fogScale = 0.0625;
    this.fog = document.createElement('canvas'); this.fog.width = Math.ceil(w * this.fogScale); this.fog.height = Math.ceil(h * this.fogScale);
    this.fogKey = '';
  }
  blob(ctx, x, y, s, rnd) {
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = s * (0.7 + rnd() * 0.5); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  }
  makeResinTile(v) {
    const S = Math.ceil(R * 2.4), cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'), rnd = mulberry32(900 + v * 31);
    ctx.translate(S / 2, S / 2);
    ctx.save(); ctx.beginPath(); hexPath(ctx, 0, 0, R * 1.08); ctx.clip();
    const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 1.1); gr.addColorStop(0, 'rgba(24,22,34,0.95)'); gr.addColorStop(1, 'rgba(18,16,26,0.55)');
    ctx.fillStyle = gr; ctx.fillRect(-S, -S, S * 2, S * 2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x = (rnd() - 0.5) * R * 2, y = (rnd() - 0.5) * R * 2, a = rnd() * TAU, len = 10 + rnd() * 22;
      ctx.strokeStyle = '#0c0b12'; ctx.lineWidth = 4 + rnd() * 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 0.8) * len * 0.6, y + Math.sin(a + 0.8) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,130,175,0.32)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(140,150,200,0.18)'; ctx.beginPath(); ctx.ellipse((rnd() - 0.5) * R * 1.4, (rnd() - 0.5) * R * 1.4, 2 + rnd() * 3, 1 + rnd() * 1.5, rnd() * 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    return cv;
  }

  // ---------- Effekte ----------
  float(x, y, text, color = '#fff', big = false) { this.floaters.push({ x, y, text, color, t: 0, life: big ? 2 : 1.4, big }); }
  burst(x, y, col, n = 14, sp = 60, life = 0.6, size = 2.2, grav = 0) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: life * (0.6 + Math.random() * 0.6), col, size: size * (0.6 + Math.random() * 0.8), grav }); }
  }
  tracer(a, b, col = '#ffe7a0', w = 1.6) { this.tracers.push({ a, b, col, t: 0, life: 0.18, w }); }
  ping(c, r, vent = false) { const p = center(c, r); this.pings.push({ x: p.x, y: p.y, t: 0, life: 1.4, vent }); }
  ring(x, y, col, life = 0.8, max = 40) { this.rings.push({ x, y, col, t: 0, life, max }); }

  // ---------- Zeichnen ----------
  draw(dt) {
    this.t += dt;
    const { ctx, g, cam } = this;
    if (this.camTarget) {
      cam.x += (this.camTarget.x - cam.x) * Math.min(1, dt * 6); cam.y += (this.camTarget.y - cam.y) * Math.min(1, dt * 6);
      if (Math.hypot(this.camTarget.x - cam.x, this.camTarget.y - cam.y) < 1) this.camTarget = null;
      this.clampCam();
    }
    this.shake = Math.max(0, this.shake - dt * 18);
    const dpr = this.dpr, sh = this.shake;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07070a'; ctx.fillRect(0, 0, this.vw, this.vh);
    const ox = sh ? (Math.random() - 0.5) * sh * 2 : 0, oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, (-cam.x * cam.z + ox) * dpr, (-cam.y * cam.z + oy) * dpr);
    const view = { x0: cam.x - 90, y0: cam.y - 90, x1: cam.x + this.vw / cam.z + 90, y1: cam.y + this.vh / cam.z + 90 };
    const inView = (p, mg = 0) => p.x > view.x0 - mg && p.x < view.x1 + mg && p.y > view.y0 - mg && p.y < view.y1 + mg;
    this.inView = inView;
    ctx.drawImage(this.base, 0, 0);
    const W = g.W, H = g.H, t = this.t;
    const explored = g.explored;
    // Harz, Säure, Feuer
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c; if (!explored[i]) continue;
      const p = center(c, r); if (!inView(p)) continue;
      if (g.resin[i]) { const tl = this.resinTiles[(c * 7 + r * 3) % 3]; ctx.drawImage(tl, p.x - tl.width / 2, p.y - tl.height / 2); }
      if (g.acid[i] >= g.round) { for (let k = 0; k < 4; k++) { const a = (t * 0.7 + k * 1.7 + i) % TAU, d = 6 + (k * 5) % 14; ctx.fillStyle = `rgba(140,255,90,${0.18 + 0.1 * Math.sin(t * 5 + k)})`; ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, 5, 3.5, 0, 0, TAU); ctx.fill(); } }
      if (g.fire[i] >= g.round && Math.random() < dt * 30) this.parts.push({ x: p.x + (Math.random() - 0.5) * 40, y: p.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 30, t: 0, life: 0.7, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd25a', size: 3 + Math.random() * 3, glow: true });
    }
    // Schachtnetz
    const vk = (v) => g.knowsVent(0, v);
    if (this.showVents) {
      ctx.lineWidth = 3;
      for (const v of g.vents) {
        if (!vk(v)) continue;
        const a = center(v.c, v.r);
        for (const l of v.links) {
          if (l < v.id) continue; const w = g.vents[l]; if (!vk(w)) continue;
          const b = center(w.c, w.r);
          ctx.strokeStyle = v.sealed || w.sealed ? 'rgba(255,150,60,0.45)' : 'rgba(150,200,255,0.4)';
          ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 12;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }
    for (const v of g.vents) { if (!vk(v) && !explored[v.r * W + v.c]) continue; const p = center(v.c, v.r); if (!inView(p)) continue; ctx.save(); ctx.translate(p.x + 14, p.y + 12); drawVent(ctx, v.sealed, t, vk(v)); ctx.restore(); }
    // Schlüsselorte
    for (const s of g.sites) {
      const p = center(s.c, s.r); if (!inView(p, 60)) continue;
      if (s.owner >= 0) {
        const col = FACTIONS[g.fac(s.owner)].color;
        ctx.strokeStyle = rgba(col, s.manned ? 0.85 : 0.4); ctx.lineWidth = 3; ctx.setLineDash(s.manned ? [] : [6, 5]);
        ctx.beginPath(); ctx.arc(p.x, p.y, R * (s.type === 'prozessor' ? 1.55 : 1.05), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.save(); ctx.translate(p.x, p.y); drawSite(ctx, s.type, t + s.id); ctx.restore();
    }
    // Bauten
    for (const b of g.buildings) {
      if (!g.bVisibleTo(0, b)) continue;
      const p = center(b.c, b.r); if (!inView(p, 40)) continue;
      const col = FACTIONS[g.fac(b.owner)].color;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = b.progress ? 0.55 : 1;
      ctx.scale(1.15, 1.15);
      drawThing(ctx, 'bld', b.type, col, 0, t + b.id, { aim: b.aim });
      ctx.globalAlpha = 1;
      if (b.progress) drawScaffold(ctx, b.progress);
      ctx.restore();
      const max = BUILDINGS[b.type].hp;
      if (b.hp < max) this.hpBar(ctx, p.x, p.y + 22, b.hp / max, 26);
      if (BUILDINGS[b.type].sentry && b.owner === 0) { const n = BUILDINGS[b.type].sentry.ammo; for (let i = 0; i < n; i++) { ctx.fillStyle = i < b.ammo ? '#ffd25a' : 'rgba(255,255,255,0.15)'; ctx.fillRect(p.x - n * 1.6 + i * 3.2, p.y + 15, 2.2, 3); } }
    }
    // Einheiten
    const list = g.units.filter((u) => !u.inside && !u.inVent && (u.owner === 0 || g.visibleTo(0, u) || u.animVisible) && !u.animHide).sort((a, b) => (g.flying(a) ? 1 : 0) - (g.flying(b) ? 1 : 0) || this.posOf(a).y - this.posOf(b).y);
    this.drawHighlights(ctx, 'under');
    for (const u of list) {
      const p = this.posOf(u); if (!inView(p, 40)) continue;
      this.drawUnit(ctx, u, p);
    }
    // Dunkelheit
    this.drawFog(ctx);
    this.drawLights(ctx, list);
    // Melder
    this.drawTrackerRing(ctx);
    this.drawBlips(ctx);
    this.drawHighlights(ctx, 'over');
    // Status über dem Nebel für eigene Einheiten
    for (const u of list) { const p = this.posOf(u); if (inView(p, 40)) this.drawBadges(ctx, u, p); }
    this.drawFx(ctx, dt);
    if (g.storm.active) this.drawStorm(ctx, dt, view);
  }

  hpBar(ctx, x, y, f, w = 22) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
    ctx.fillStyle = f > 0.6 ? '#6fdc6a' : f > 0.3 ? '#ffc040' : '#ff5a40'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 2);
  }

  drawUnit(ctx, u, p) {
    const g = this.g, d = UNITS[u.type];
    const col = FACTIONS[g.fac(u.owner)].color;
    ctx.save(); ctx.translate(p.x, p.y);
    if (u.fade != null) ctx.globalAlpha = u.fade;
    const sel = this.hl.sel === u;
    if (sel) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -this.t * 10; ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (u.owner !== 2 && !sel) { ctx.fillStyle = rgba(col, 0.16); ctx.beginPath(); ctx.ellipse(0, 4, R * 0.62, R * 0.42, 0, 0, TAU); ctx.fill(); }
    const s = d.cls === 'air' ? 1.3 : d.cls === 'veh' ? 1.3 : d.cls === 'egg' ? 1.3 : 1.45;
    ctx.scale(s, s);
    drawThing(ctx, 'unit', u.type, col, u.face, this.t + u.id * 0.37, { flying: g.flying(u) });
    ctx.restore();
  }
  drawBadges(ctx, u, p) {
    const g = this.g, d = UNITS[u.type];
    if (g.isXeno(u) && u.type === 'ei') return;
    const y0 = p.y + (d.cls === 'air' ? 28 : 24);
    if (u.hp < d.hp || u.owner === 0) this.hpBar(ctx, p.x, y0, u.hp / d.hp, d.cls === 'xeno' ? 18 : 22);
    if (u.owner === 0 && u.moved && u.acted && g.current.id === 0) { ctx.fillStyle = 'rgba(10,10,14,0.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.55, 0, TAU); ctx.fill(); }
    let bx = p.x + 14;
    const badge = (txt, bg, fg = '#fff') => { ctx.font = 'bold 9px system-ui'; const w = ctx.measureText(txt).width + 6; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 2, p.y - 24, w, 12, 3) : ctx.rect(bx - 2, p.y - 24, w, 12); ctx.fill(); ctx.fillStyle = fg; ctx.fillText(txt, bx + 1, p.y - 15); bx += w + 2; };
    if (u.host) { const a = 0.6 + 0.4 * Math.sin(this.t * 6); ctx.strokeStyle = `rgba(255,70,60,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.62, 0, TAU); ctx.stroke(); badge(`☣ ${u.host.t}`, '#8a1a14'); }
    if (u.owner === 0 && d.ammo) { if (u.ammo <= 1) badge(u.ammo ? 'Mun 1' : 'Mun 0', u.ammo ? '#7a5a14' : '#6a1a14'); }
    if (u.cargo && u.cargo.length) badge(`${u.cargo.length}▲`, 'rgba(20,30,40,0.85)');
    if (u.type === 'schiff' && u.landed) badge('gelandet', 'rgba(30,40,30,0.85)', '#cfe8c8');
  }

  drawFog(ctx) {
    const g = this.g, v = g.vis[0]; if (!v) return;
    const key = `${g.visV}|${g.round}|${g.flares.length}|${g.buildings.length}|${g.storm.active}`;
    if (key !== this.fogKey) {
      this.fogKey = key;
      const f = this.fog, fc = f.getContext('2d'), s = this.fogScale;
      fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, f.width, f.height);
      fc.fillStyle = 'rgba(3,4,8,0.975)'; fc.fillRect(0, 0, f.width, f.height);
      fc.setTransform(s, 0, 0, s, 0, 0);
      const lit = g.lit || [];
      const storm = g.storm.active ? 0.06 : 0;
      for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
        const i = r * g.W + c;
        let a = 0.975;
        if (v.seen[i]) a = lit[i] ? 0.06 : 0.36 + storm; else if (g.explored[i]) a = 0.74 + storm;
        if (a >= 0.975) continue;
        const p = center(c, r);
        fc.globalCompositeOperation = 'destination-out'; fc.fillStyle = '#000'; fc.beginPath(); hexPath(fc, p.x, p.y, R + 3); fc.fill();
        fc.globalCompositeOperation = 'source-over'; fc.fillStyle = `rgba(3,4,8,${a})`; fc.beginPath(); hexPath(fc, p.x, p.y, R + 3); fc.fill();
      }
      fc.globalCompositeOperation = 'source-over';
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, 0, 0, this.fog.width / this.fogScale, this.fog.height / this.fogScale);
  }
  drawLights(ctx, units) {
    const g = this.g, t = this.t;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, rad, col, a) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill(); };
    for (const b of g.buildings) {
      const L = BUILDINGS[b.type].light; if (!L || b.progress || !g.bVisibleTo(0, b)) continue;
      const p = center(b.c, b.r); if (!this.inView(p, 200)) continue;
      glow(p.x, p.y, L * HW * 1.05, b.type === 'flutlicht' ? '#fff2d0' : '#ffcc88', 0.13);
    }
    for (const f of g.flares) { const p = center(f.c, f.r); const fl = 0.85 + 0.15 * Math.sin(t * 23 + f.c); glow(p.x, p.y, f.rad * HW * 1.25, '#ff8a6a', 0.2 * fl); glow(p.x, p.y, 12, '#fff0e0', 0.8 * fl); }
    // Taschenlampen der sichtbaren Trupps
    for (const u of units) {
      if (g.isXeno(u) || UNITS[u.type].cls === 'air') continue;
      const p = this.posOf(u); if (!this.inView(p, 120)) continue;
      const a = u.face, len = HW * 2.2;
      const gr = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, len); gr.addColorStop(0, 'rgba(255,245,215,0.13)'); gr.addColorStop(1, 'rgba(255,245,215,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, len, a - 0.42, a + 0.42); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  drawTrackerRing(ctx) {
    const u = this.hl.sel; if (!u || u.isBld || u.owner !== 0 || u.inside) return;
    const tr = UNITS[u.type].tracker; if (!tr) return;
    const p = this.posOf(u), rad = tr * HW;
    ctx.save();
    ctx.strokeStyle = rgba(TRK, 0.35); ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const a = (this.t * 1.3) % TAU;
    const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad); gr.addColorStop(0, rgba(TRK, 0.0)); gr.addColorStop(0.7, rgba(TRK, 0.07)); gr.addColorStop(1, rgba(TRK, 0.14));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, rad, a - 0.5, a); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawBlips(ctx) {
    const g = this.g, t = this.t;
    if (g.current.id !== 0 && !this.showOldBlips) return;
    ctx.save();
    for (const b of g.blips) {
      const p = center(b.c, b.r); if (!this.inView(p)) continue;
      const k = (t * 0.9 + (b.c * 0.13 + b.r * 0.07)) % 1;
      if (b.vent) {
        ctx.strokeStyle = rgba(TRK, 0.55 * (1 - k)); ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 10 + k * 30, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 28); gr.addColorStop(0, rgba(TRK, 0.32)); gr.addColorStop(1, rgba(TRK, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = rgba(TRK, 0.7 * (1 - k)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 24, 0, TAU); ctx.stroke();
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 13); gr.addColorStop(0, 'rgba(220,255,230,0.95)'); gr.addColorStop(0.35, rgba(TRK, 0.8)); gr.addColorStop(1, rgba(TRK, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill();
      }
      if (this.cam.z > 0.7) { ctx.font = '600 9px system-ui'; ctx.fillStyle = rgba(TRK, 0.85); ctx.textAlign = 'center'; ctx.fillText(b.vent ? 'SCHACHT' : 'BEWEGUNG', p.x, p.y - 17); ctx.textAlign = 'left'; }
    }
    ctx.restore();
  }
  drawHighlights(ctx, layer) {
    const h = this.hl, t = this.t;
    if (layer === 'under') {
      if (h.move) {
        ctx.fillStyle = 'rgba(80,170,255,0.16)'; ctx.strokeStyle = 'rgba(120,200,255,0.45)'; ctx.lineWidth = 1;
        for (const [, v] of h.move) { if (!v.end || v.cost === 0) continue; const p = center(v.c, v.r); if (!this.inView(p)) continue; ctx.beginPath(); hexPath(ctx, p.x, p.y, R - 2); ctx.fill(); ctx.stroke(); }
      }
      if (h.target.length) {
        const a = 0.18 + 0.08 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255,200,80,${a})`; ctx.strokeStyle = 'rgba(255,210,110,0.8)'; ctx.lineWidth = 1.5;
        for (const [c, r] of h.target) { const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, R - 2); ctx.fill(); ctx.stroke(); }
      }
      return;
    }
    if (h.path && h.path.length > 1) {
      ctx.strokeStyle = 'rgba(200,235,255,0.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); h.path.forEach(([c, r], i) => { const p = center(c, r); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const e of h.attack) {
      const p = this.posOf(e), rad = R * 0.7 + Math.sin(t * 6) * 2;
      ctx.strokeStyle = e === h.pending ? '#fff' : '#ff4a3a'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(p.x, p.y, rad, a - 0.35, a + 0.35); ctx.stroke(); }
    }
  }
  drawFx(ctx, dt) {
    for (const tr of this.tracers) {
      tr.t += dt; const k = 1 - tr.t / tr.life;
      ctx.strokeStyle = rgba(tr.col, Math.max(0, k)); ctx.lineWidth = tr.w;
      ctx.beginPath(); ctx.moveTo(tr.a.x, tr.a.y); ctx.lineTo(tr.b.x, tr.b.y); ctx.stroke();
    }
    this.tracers = this.tracers.filter((x) => x.t < x.life);
    ctx.save();
    for (const p of this.parts) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.vx *= 0.96; p.vy *= 0.96;
      const k = 1 - p.t / p.life; if (k <= 0) continue;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(p.col, k); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.glow ? k + 0.3 : 1), 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const r of this.rings) { r.t += dt; const k = r.t / r.life; ctx.strokeStyle = rgba(r.col, Math.max(0, 1 - k)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(r.x, r.y, 6 + k * r.max, 0, TAU); ctx.stroke(); }
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const p of this.pings) {
      p.t += dt; const k = p.t / p.life;
      ctx.strokeStyle = rgba(TRK, Math.max(0, 0.9 - k)); ctx.lineWidth = 2;
      if (p.vent) ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 + k * 34, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(TRK, Math.max(0, 0.8 - k)); ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill();
    }
    this.pings = this.pings.filter((p) => p.t < p.life);
    for (const f of this.floaters) {
      f.t += dt; const k = f.t / f.life;
      ctx.font = `800 ${f.big ? 18 : 12}px system-ui`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(0,0,0,${0.7 * (1 - k)})`; ctx.fillText(f.text, f.x + 1, f.y - 18 - k * 22 + 1);
      ctx.fillStyle = rgba(f.color.startsWith('#') ? f.color : '#ffffff', Math.max(0, 1 - k)); ctx.fillText(f.text, f.x, f.y - 18 - k * 22);
      ctx.textAlign = 'left';
    }
    this.floaters = this.floaters.filter((f) => f.t < f.life);
  }
  drawStorm(ctx, dt, v) {
    this.dust = this.dust || Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() }));
    ctx.fillStyle = 'rgba(120,95,70,0.12)'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    ctx.strokeStyle = 'rgba(200,170,130,0.22)'; ctx.lineWidth = 1;
    for (const d of this.dust) {
      d.x = (d.x + dt * 0.25 * d.s) % 1; d.y = (d.y + dt * 0.04 * d.s) % 1;
      const x = v.x0 + d.x * (v.x1 - v.x0), y = v.y0 + d.y * (v.y1 - v.y0);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 * d.s, y + 2); ctx.stroke();
    }
  }

  // ---------- Übersichtskarte ----------
  drawMinimap(cv) {
    const g = this.g, ctx = cv.getContext('2d'), W = g.W, H = g.H;
    const sx = cv.width / W, sy = cv.height / H;
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, cv.width, cv.height);
    const v = g.vis[0];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c; if (!g.explored[i]) continue;
      let col = TERRAIN[g.map.t[i]].col;
      if (g.resin[i]) col = '#2a2238';
      ctx.fillStyle = v && v.seen[i] ? shade(col, 0.15) : shade(col, -0.35);
      ctx.fillRect(c * sx + (r & 1) * sx / 2, r * sy, sx + 0.6, sy + 0.6);
    }
    const dot = (c, r, col, s = 2.2) => { ctx.fillStyle = col; ctx.fillRect(c * sx + (r & 1) * sx / 2 + sx / 2 - s / 2, r * sy + sy / 2 - s / 2, s, s); };
    for (const s of g.sites) dot(s.c, s.r, s.owner >= 0 ? FACTIONS[g.fac(s.owner)].color : '#bbb', 4);
    for (const b of g.buildings) if (g.bVisibleTo(0, b)) dot(b.c, b.r, FACTIONS[g.fac(b.owner)].color, 3);
    for (const u of g.units) if (!u.inside && !u.inVent && (u.owner === 0 || g.visibleTo(0, u))) dot(u.c, u.r, FACTIONS[g.fac(u.owner)].color, 2.6);
    for (const b of g.blips) dot(b.c, b.r, TRK, 2.6);
    const ms = g.map.size, k = cv.width / ms.w;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(this.cam.x * k, this.cam.y * (cv.height / ms.h), this.vw / this.cam.z * k, this.vh / this.cam.z * (cv.height / ms.h));
  }
}
