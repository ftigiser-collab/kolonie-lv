// Steuerung: Eingabe, Auswahl, Panel, Animation der Ereignisse, Rundenablauf
import { center, pixelToHex, distance, HW } from './hex.js';
import { UNITS, BUILDINGS, SITES, TERRAIN, FACTIONS, BUILD_LIST, STAGE_NAMES, HOST_TIME, OBJECTIVES, ORBITAL, CHARGE, CORE } from './data.js';
import { iconCanvas } from './sprites.js';
import { aiTurn } from './ai.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Controller {
  constructor(game, renderer, hooks = {}) {
    this.g = game; this.r = renderer; this.hooks = hooks;
    this.busy = false; this.sel = null; this.reach = null; this.attacks = []; this.pending = null; this.tmode = null;
    this.tweens = []; this.speed = +(localStorage.getItem('schachtbrut-speed') || 1);
    this.mmT = 0;
    this.bindInput(); this.bindDom();
  }

  // ---------- Schleife ----------
  update(dt) {
    for (const tw of this.tweens) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) tw.done(); }
    this.tweens = this.tweens.filter((tw) => tw.t < tw.dur);
    this.mmT -= dt;
    if (this.mmT <= 0) { this.mmT = 0.25; this.r.drawMinimap($('#minimap')); }
  }
  tween(dur, fn) { return new Promise((res) => { if (dur <= 0) { fn(1); res(); return; } this.tweens.push({ dur, t: 0, fn, done: res }); }); }
  aiSpeed() { return this.g.current.id === 0 ? 1 : this.speed; }

  // ---------- Ereignisse abspielen ----------
  async play() {
    while (this.g.events.length) {
      const e = this.g.events.shift();
      try { await this.anim(e); } catch (err) { console.warn(err); }
    }
    this.refresh();
  }
  find(id) { return this.g.units.find((u) => u.id === id) || this.g.buildings.find((b) => b.id === id) || this.ghosts?.[id]; }
  seenHex(c, r) { const v = this.g.vis[0]; return v && v.seen[this.g.idx(c, r)]; }
  async ensureVisible(x, y) {
    if (this.r.onScreen(x, y, 70)) return;
    this.r.centerOn(x, y, true);
    await sleep(320 / this.aiSpeed());
  }
  async anim(e) {
    const g = this.g, r = this.r, sp = this.aiSpeed();
    switch (e.type) {
      case 'msg': this.logMsg(e.text, e.kind); break;
      case 'float': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.float(p.x, p.y, e.text, e.color); } break;
      case 'move': {
        const u = g.units.find((x) => x.id === e.id);
        if (!u) break;
        const vis = (c, rr) => u.owner === 0 || g.visibleTo(0, { ...u, c, r: rr, inVent: false, inside: null });
        if (!e.path.some(([c, rr]) => vis(c, rr))) break;
        const first = e.path.find(([c, rr]) => vis(c, rr));
        const fp = center(first[0], first[1]);
        if (u.owner !== 0) await this.ensureVisible(fp.x, fp.y);
        const per = (u.owner === 0 ? 0.1 : 0.12) / sp;
        for (let i = 1; i < e.path.length; i++) {
          const a = center(...e.path[i - 1]), b = center(...e.path[i]);
          const show = vis(...e.path[i]) || vis(...e.path[i - 1]);
          u.animVisible = show; u.animHide = !show && u.owner !== 0;
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          await this.tween(per, (k) => { u.vis = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; u.face = ang; });
        }
        u.vis = null; u.animVisible = false; u.animHide = false;
        if (UNITS[u.type].cls === 'veh') for (let i = 1; i < e.path.length; i++) { if (!this.seenHex(...e.path[i])) continue; const a = center(...e.path[i - 1]), b = center(...e.path[i]); r.tracks(a.x, a.y, b.x, b.y, u.type === 'lademech' ? 5 : 8); }
        if (e.stopped) await sleep(200);
        break;
      }
      case 'attack': {
        const a = this.find(e.a), t = this.find(e.t);
        if (!a || !t) break;
        const ap = a.isBld ? center(a.c, a.r) : r.posOf(a), tp = t.isBld ? center(t.c, t.r) : r.posOf(t);
        const aSeen = a.owner === 0 || (a.isBld ? this.seenHex(a.c, a.r) : g.visibleTo(0, a)) || this.seenHex(a.c, a.r);
        const tSeen = t.owner === 0 || this.seenHex(t.c, t.r);
        if (!aSeen && !tSeen) break;
        await this.ensureVisible((ap.x + tp.x) / 2, (ap.y + tp.y) / 2);
        if (a.isBld) a.aim = Math.atan2(tp.y - ap.y, tp.x - ap.x);
        else a.face = Math.atan2(tp.y - ap.y, tp.x - ap.x);
        const xeno = !a.isBld && g.isXeno(a);
        if (xeno && a.type === 'spucker') {
          await this.tween(0.3 / sp, (k) => { const x = ap.x + (tp.x - ap.x) * k, y = ap.y + (tp.y - ap.y) * k - Math.sin(k * Math.PI) * 26; r.parts.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.25, col: '#b6ff5a', size: 3, glow: true }); });
          r.burst(tp.x, tp.y, '#b6ff5a', 18, 70, 0.6, 2, 40); r.flash(tp.x, tp.y, 60, '#9dff6a', 0.4, 0.35);
        } else if (xeno) {
          // Hieb: kurzer Satz nach vorn
          const back = { ...ap };
          await this.tween(0.08 / sp, (k) => { a.vis = { x: back.x + (tp.x - back.x) * 0.35 * k, y: back.y + (tp.y - back.y) * 0.35 * k }; });
          r.burst(tp.x, tp.y, '#ff6a4a', 10, 70, 0.4, 2);
          r.tracer({ x: tp.x - 8, y: tp.y - 8 }, { x: tp.x + 8, y: tp.y + 8 }, '#ffd0c0', 2);
          await this.tween(0.1 / sp, (k) => { a.vis = { x: back.x + (tp.x - back.x) * 0.35 * (1 - k), y: back.y + (tp.y - back.y) * 0.35 * (1 - k) }; });
          a.vis = null;
        } else {
          const type = a.isBld ? 'sentry' : a.type;
          const flame = type === 'brenner';
          const n = type === 'smartgun' || type === 'sentry' ? 4 : flame ? 1 : 2;
          for (let i = 0; i < n; i++) {
            const jx = (Math.random() - 0.5) * 10, jy = (Math.random() - 0.5) * 10;
            if (flame) {
              r.flash(ap.x, ap.y, 110, '#ff9a3a', 0.5, 0.45); r.flash(tp.x, tp.y, 90, '#ff7a2a', 0.6, 0.4);
              for (let k = 0; k < 26; k++) { const f = Math.random(); r.parts.push({ x: ap.x + (tp.x - ap.x) * f * 0.3, y: ap.y + (tp.y - ap.y) * f * 0.3, vx: (tp.x - ap.x) * (1.6 + Math.random()), vy: (tp.y - ap.y) * (1.6 + Math.random()), t: 0, life: 0.35 + Math.random() * 0.2, col: Math.random() < 0.5 ? '#ff7a1a' : '#ffd25a', size: 3 + Math.random() * 3, glow: true }); }
            } else {
              const col = type === 'werfer' ? '#ffd0a0' : FACTIONS[g.fac(a.owner)].color === '#72b6f0' ? '#cfe8ff' : '#ffe7a0';
              r.tracer(ap, { x: tp.x + jx, y: tp.y + jy }, col, type === 'werfer' ? 3 : 1.6);
              r.flash(ap.x, ap.y, 70, '#ffe2a8', 0.1, 0.4);
              if (type !== 'werfer') { const fa = (a.face || a.aim || 0) + Math.PI / 2; r.parts.push({ x: ap.x, y: ap.y, vx: Math.cos(fa) * (30 + Math.random() * 20), vy: Math.sin(fa) * (30 + Math.random() * 20) - 10, t: 0, life: 0.5, col: '#d8b860', size: 1, grav: 120 }); }
              r.parts.push({ x: ap.x + Math.cos(a.face || a.aim || 0) * 14, y: ap.y + Math.sin(a.face || a.aim || 0) * 14, vx: 0, vy: 0, t: 0, life: 0.08, col: '#fff2b0', size: 5, glow: true });
            }
            await sleep(60 / sp);
          }
          if (type === 'werfer' || type === 'panzerwagen' || type === 'schiff') { r.burst(tp.x, tp.y, '#ffb04a', 16, 80, 0.5, 2.5); r.flash(tp.x, tp.y, 120, '#ffb04a', 0.3, 0.5); }
        }
        const hitXeno = !t.isBld && g.isXeno(t);
        r.burst(tp.x, tp.y, hitXeno ? '#9dff6a' : t.isBld ? '#c8c0b0' : '#ff8a6a', 8, 50, 0.4, 1.8);
        r.float(tp.x, tp.y, `−${e.dmg}`, e.counter ? '#ffc070' : e.react ? '#ffe070' : '#ff7060');
        await sleep(160 / sp);
        break;
      }
      case 'leap': {
        const t = this.find(e.t); if (!t) break;
        const tp = r.posOf(t);
        if (!this.seenHex(t.c, t.r) && t.owner !== 0) break;
        await this.ensureVisible(tp.x, tp.y);
        if (e.ok) { r.shake = 7; r.ring(tp.x, tp.y, '#ff4a3a', 0.8, 40); r.float(tp.x, tp.y, 'BEFALLEN!', '#ff5a4a', true); await sleep(650 / sp); }
        else { r.float(tp.x, tp.y, 'abgewehrt', '#cfe8c8'); await sleep(250 / sp); }
        break;
      }
      case 'die': {
        if (!this.seenHex(e.c, e.r) && e.owner !== 0) break;
        const p = center(e.c, e.r);
        if (e.bld) { r.burst(p.x, p.y, '#a09080', 40, 90, 1.1, 4); r.burst(p.x, p.y, '#ff9a3a', 18, 70, 0.6, 3); r.shake = 6; r.flash(p.x, p.y, 160, '#ffa040', 0.5, 0.5); r.decal('scorch', p.x, p.y, 1.2); r.decal('rubble', p.x, p.y); }
        else if (e.xeno) { r.burst(p.x, p.y, '#9dff6a', 26, 90, 0.8, 2.6); r.burst(p.x, p.y, '#1a1d28', 12, 50, 0.6, 3); r.flash(p.x, p.y, 70, '#9dff6a', 0.4, 0.3); r.decal('acid', p.x, p.y, e.kind === 'mutter' ? 2 : e.kind === 'brecher' ? 1.4 : 1); }
        else if (['lademech', 'schlepper', 'panzerwagen', 'schiff'].includes(e.kind)) { r.burst(p.x, p.y, '#ffb04a', 36, 120, 0.8, 3.5); r.burst(p.x, p.y, '#3a3632', 26, 60, 1.4, 5); r.shake = 9; r.flash(p.x, p.y, 200, '#ffa040', 0.6, 0.6); r.decal('wreck', p.x, p.y, e.kind === 'schiff' ? 1.5 : 1); }
        else { r.burst(p.x, p.y, '#8a6a5a', 12, 40, 0.6, 2); r.decal('blood', p.x, p.y); }
        await sleep(150 / sp);
        break;
      }
      case 'acid': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.burst(p.x, p.y, '#b6ff7a', 20, 110, 0.7, 2, 60); r.decal('acid', p.x, p.y, 1.3); r.float(p.x, p.y + 10, 'Säure!', '#9dff6a'); } break;
      case 'burst': {
        const p = center(e.c, e.r);
        if (!this.seenHex(e.c, e.r) && e.owner !== 0) break;
        await this.ensureVisible(p.x, p.y);
        r.shake = 12; r.burst(p.x, p.y, '#c8243a', 40, 130, 0.9, 3, 80); r.decal('blood', p.x, p.y, 1.5); r.decal('blood', p.x + 6, p.y - 4); r.burst(p.x, p.y, '#e8c0a8', 14, 60, 0.6, 2);
        r.float(p.x, p.y, 'AUSBRUCH!', '#ff4a4a', true);
        await sleep(800 / sp);
        break;
      }
      case 'ping': r.ping(e.c, e.r, e.vent); await sleep(45 / sp); break;
      case 'emerge': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.burst(p.x, p.y, '#6a6070', 14, 50, 0.7, 3); } break;
      case 'flare': {
        const a = center(...e.from), b = center(e.c, e.r);
        if (e.owner !== 0 && !this.seenHex(e.c, e.r)) break;
        await this.tween(0.35 / sp, (k) => { const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 50; r.parts.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.3, col: '#ffb08a', size: 2.5, glow: true }); });
        r.ring(b.x, b.y, '#ffd0b0', 0.9, 60); r.burst(b.x, b.y, '#fff0e0', 20, 60, 0.6, 2.5); r.flash(b.x, b.y, 260, '#ffb090', 0.7, 0.6);
        break;
      }
      case 'weld': case 'breakvent': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.burst(p.x + 14, p.y + 12, '#ffb04a', 24, 70, 0.5, 1.6, 120); if (e.type === 'breakvent') r.shake = 4; await sleep(200 / sp); } break;
      case 'burn': { const u = this.find(e.id), p = center(e.c, e.r); if (this.seenHex(e.c, e.r)) { r.decal('scorch', p.x, p.y, 0.8); r.flash(p.x, p.y, 120, '#ff8a3a', 0.6, 0.5); const a = u ? r.posOf(u) : p; for (let k = 0; k < 30; k++) r.parts.push({ x: a.x, y: a.y, vx: (p.x - a.x) * (2 + Math.random()), vy: (p.y - a.y) * (2 + Math.random()), t: 0, life: 0.45, col: Math.random() < 0.5 ? '#ff7a1a' : '#ffd25a', size: 3 + Math.random() * 3, glow: true }); await sleep(250); } break; }
      case 'spawn': {
        const u = g.units.find((x) => x.id === e.id); if (!u) break;
        if (u.owner !== 0 && !g.visibleTo(0, u)) break;
        u.fade = 0; await this.tween(0.25 / sp, (k) => { u.fade = k; }); u.fade = null;
        break;
      }
      case 'land': { const u = this.find(e.id); if (u && (u.owner === 0 || g.visibleTo(0, u))) { const p = r.posOf(u); r.ring(p.x, p.y, '#c8b898', 0.6, 30); r.burst(p.x, p.y, '#8a7a6a', 16, 60, 0.7, 3); } break; }
      case 'build': { if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.burst(p.x, p.y, '#a09080', 16, 50, 0.6, 2.5); } break; }
      case 'capture': { const s = g.sites[e.sid], p = center(s.c, s.r); if (this.seenHex(s.c, s.r) || e.owner === 0) { r.ring(p.x, p.y, FACTIONS[g.fac(e.owner)].color, 1, 50); } break; }
      case 'hatch': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.ring(p.x, p.y, '#a98cff', 0.8, 30); } break;
      case 'contact': { const p = center(e.c, e.r); r.ring(p.x, p.y, '#ff4a3a', 0.8, 36); r.shake = 4; await sleep(250); break; }
      case 'banner': await this.banner(e.text, e.sub, 1.5); break;
      case 'dropin': case 'shipin': {
        const us = e.ids.map((id) => g.units.find((x) => x.id === id)).filter(Boolean);
        if (!us.length || (e.owner !== 0 && !this.seenHex(e.c, e.r))) break;
        await this.dropFlight(us, e.c, e.r, e.owner, e.type === 'shipin');
        break;
      }
      case 'dropout': if (e.owner === 0 || this.seenHex(e.c, e.r)) await this.dropFlight([], e.c, e.r, e.owner, false); break;
      case 'scan': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.ring(p.x, p.y, '#9fd8ff', 0.9, 30); await sleep(250 / sp); } break;
      case 'defect': {
        const p = center(e.c, e.r);
        if (!this.seenHex(e.c, e.r) && e.former !== 0) break;
        await this.ensureVisible(p.x, p.y);
        r.shake = 6; r.ring(p.x, p.y, '#a98cff', 1.2, 70); r.burst(p.x, p.y, '#e8e8ff', 20, 80, 0.7, 2);
        r.float(p.x, p.y, 'KONZERNBEFEHL', '#c8b0ff', true);
        await sleep(900 / sp);
        break;
      }
      case 'cool': if (this.seenHex(e.c, e.r)) { const p = center(e.c, e.r); r.burst(p.x, p.y, '#bfe8ff', 30, 70, 1.0, 4); r.float(p.x, p.y, 'Kühlung', '#bfe8ff'); await sleep(250 / sp); } break;
      case 'plant': if (e.owner === 0) { const p = center(e.c, e.r); r.ring(p.x, p.y, '#ff5a3a', 0.6, 20); } break;
      case 'orbital': case 'charge': {
        const p = center(e.c, e.r);
        if (!this.seenHex(e.c, e.r) && e.owner !== 0 && !this.g.near(0, e.c, e.r, 6)) break;
        await this.ensureVisible(p.x, p.y);
        if (e.type === 'orbital') {
          await this.tween(0.5 / sp, (k) => { for (let i = 0; i < 3; i++) r.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y - 260 * (1 - k) + (Math.random() - 0.5) * 40, vx: 0, vy: 0, t: 0, life: 0.25, col: '#e8f4ff', size: 5 + Math.random() * 4, glow: true }); });
          r.shake = 16;
        } else r.shake = 9;
        r.ring(p.x, p.y, '#fff0d0', 0.7, e.type === 'orbital' ? 120 : 70);
        r.flash(p.x, p.y, e.type === 'orbital' ? 520 : 300, '#fff0d0', 0.9, 0.9);
        r.decal(e.type === 'orbital' ? 'crater' : 'scorch', p.x, p.y, e.type === 'orbital' ? 1.3 : 1.6);
        r.burst(p.x, p.y, '#ffb04a', 60, 200, 0.9, 4); r.burst(p.x, p.y, '#fff4e0', 30, 120, 0.5, 3); r.burst(p.x, p.y, '#4a4440', 40, 90, 1.6, 6);
        await sleep(450 / sp);
        break;
      }
    }
  }

  // Lieferflug: Landungsschiff fliegt ein, setzt ab, fliegt wieder ab
  async dropFlight(us, c, r, owner, isShip) {
    const g = this.g, R = this.r, sp = this.aiSpeed();
    const land = center(c, r), dir = g.map.lz.c > g.W / 2 ? 1 : -1;
    const start = { x: land.x + dir * 1200, y: land.y - 320 }, exit = { x: land.x + dir * 1300, y: land.y + 260 };
    if (owner === 0 || this.seenHex(c, r)) await this.ensureVisible(land.x, land.y);
    for (const x of us) x.animHide = true;
    const col = FACTIONS[g.fac(owner)].color;
    const gs = { x: start.x, y: start.y, face: Math.atan2(land.y - start.y, land.x - start.x), alt: 1, col, ramp: 0, gear: 0, seed: (c * 31 + r * 7) % 97 + 1 };
    const dust = (k) => { if (Math.random() < k) R.parts.push({ x: gs.x + (Math.random() - 0.5) * 70, y: gs.y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, t: 0, life: 1.4, col: '#9a8a7a', size: 6 + Math.random() * 6, grow: 10, fade: 0.22, soft: true }); };
    R.ghosts.push(gs);
    const ease = (k) => 1 - (1 - k) ** 3;
    await this.tween(1.4 / sp, (k) => { const e = ease(k); gs.x = start.x + (land.x - start.x) * e; gs.y = start.y + (land.y - start.y) * e; gs.alt = isShip ? 1 : k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45; gs.gear = isShip ? 0 : Math.max(0, 1 - gs.alt / 0.4); if (!isShip && gs.alt < 0.45) { dust(0.9); dust(0.6); } });
    if (isShip) {
      R.ghosts = R.ghosts.filter((x) => x !== gs);
      for (const x of us) { x.animHide = false; x.face = gs.face; x.dface = gs.face; }
      return;
    }
    R.burst(land.x, land.y, '#9a8a7a', 30, 90, 0.9, 4); R.ring(land.x, land.y, '#c8b898', 0.6, 40); R.shake = Math.max(R.shake, 3);
    for (let i = 0; i < 12; i++) dust(1);
    await this.tween(0.35 / sp, (k) => { gs.ramp = k; });
    for (const x of us) { x.animHide = false; x.fade = 0; }
    await this.tween(0.4 / sp, (k) => { for (const x of us) x.fade = k; });
    for (const x of us) x.fade = null;
    await sleep(120 / sp);
    await this.tween(0.3 / sp, (k) => { gs.ramp = 1 - k; });
    const from = { x: gs.x, y: gs.y };
    await this.tween(1.1 / sp, (k) => { gs.alt = Math.min(1, k * 2.5); gs.gear = Math.max(0, 1 - gs.alt / 0.4); if (gs.alt < 0.45) dust(0.8); const e = k * k; gs.x = from.x + (exit.x - from.x) * e; gs.y = from.y + (exit.y - from.y) * e; gs.face = Math.atan2(exit.y - from.y, exit.x - from.x) * Math.min(1, k * 3) + gs.face * (1 - Math.min(1, k * 3)); });
    R.ghosts = R.ghosts.filter((x) => x !== gs);
  }
  async playIntro() {
    const g = this.g;
    if (g.fac(0) !== 'marines') return;
    this.busy = true;
    const ms = g.units.filter((x) => x.owner === 0);
    for (const x of ms) x.animHide = true;
    const L = g.map.lz, p = center(L.c, L.r);
    this.r.centerOn(p.x, p.y, false);
    const groups = [ms.slice(0, 3), ms.slice(3)];
    for (const grp of groups) {
      if (!grp.length) continue;
      const cc = Math.round(grp.reduce((s, x) => s + x.c, 0) / grp.length), rr = Math.round(grp.reduce((s, x) => s + x.r, 0) / grp.length);
      await this.dropFlight(grp, cc, rr, 0, false);
    }
    this.busy = false;
    this.refresh();
  }

  // ---------- Eingabe ----------
  bindInput() {
    const cv = this.r.cv, pts = new Map();
    let down = null, pinch = null;
    cv.addEventListener('pointerdown', (ev) => {
      cv.setPointerCapture(ev.pointerId);
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 1) down = { x: ev.clientX, y: ev.clientY, cx: this.r.cam.x, cy: this.r.cam.y, t: performance.now(), moved: false };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.r.cam.z }; down = null; }
    });
    cv.addEventListener('pointermove', (ev) => {
      if (!pts.has(ev.pointerId)) { this.hover(ev.clientX, ev.clientY); return; }
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this.r.zoomAt(mx, my, (pinch.z * d / pinch.d) / this.r.cam.z);
        return;
      }
      if (down) {
        const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
        if (Math.hypot(dx, dy) > 8) down.moved = true;
        if (down.moved) { this.r.camTarget = null; this.r.cam.x = down.cx - dx / this.r.cam.z; this.r.cam.y = down.cy - dy / this.r.cam.z; this.r.clampCam(); }
      }
    });
    const up = (ev) => {
      pts.delete(ev.pointerId);
      if (pts.size < 2) pinch = null;
      if (down && !down.moved && pts.size === 0) {
        const w = this.r.s2w(ev.clientX, ev.clientY), h = pixelToHex(w.x, w.y);
        if (this.g.inb(h.col, h.row)) this.tap(h.col, h.row);
      }
      if (pts.size === 0) down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (ev) => { pts.delete(ev.pointerId); down = null; pinch = null; });
    cv.addEventListener('wheel', (ev) => { ev.preventDefault(); this.r.zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    window.addEventListener('resize', () => this.r.resize());
    window.addEventListener('keydown', (ev) => {
      if (ev.target.tagName === 'INPUT') return;
      const k = ev.key.toLowerCase();
      if (k === 'e') this.endTurn();
      else if (k === 'n') this.nextUnit();
      else if (k === 'escape') this.deselect();
      else if (k === 'v') this.toggleVents();
      else if (k === ' ' && this.pending) { ev.preventDefault(); this.doAttack(this.pending); }
      const pan = 60 / this.r.cam.z;
      if (k === 'w' || k === 'arrowup') { this.r.cam.y -= pan; this.r.clampCam(); }
      if (k === 's' || k === 'arrowdown') { this.r.cam.y += pan; this.r.clampCam(); }
      if (k === 'a' || k === 'arrowleft') { this.r.cam.x -= pan; this.r.clampCam(); }
      if (k === 'd' || k === 'arrowright') { this.r.cam.x += pan; this.r.clampCam(); }
    });
    const mm = $('#minimap');
    mm.addEventListener('pointerdown', (ev) => {
      const rect = mm.getBoundingClientRect(), ms = this.g.map.size;
      this.r.centerOn((ev.clientX - rect.left) / rect.width * ms.w, (ev.clientY - rect.top) / rect.height * ms.h, true);
    });
  }
  hover(sx, sy) {
    if (!this.sel || this.sel.isBld || !this.reach || this.busy) { this.r.hl.path = null; return; }
    const w = this.r.s2w(sx, sy), h = pixelToHex(w.x, w.y);
    const v = this.g.inb(h.col, h.row) && this.reach.get(this.g.idx(h.col, h.row));
    this.r.hl.path = v && v.end && v.cost > 0 ? [[this.sel.c, this.sel.r], ...this.g.pathTo(this.reach, h.col, h.row)] : null;
  }

  myTurn() { return !this.busy && !this.g.state && this.g.current.id === 0; }

  async tap(c, r) {
    const g = this.g;
    if (this.busy) return;
    // Zielmodus
    if (this.tmode) {
      const hit = this.tmode.hexes.find(([x, y]) => x === c && y === r);
      const tm = this.tmode; this.tmode = null; this.r.hl.target = [];
      if (hit) {
        await this.run(() => tm.cb(c, r));
        const e = this.sel;
        if (e && (e.isBld ? g.buildings.includes(e) : g.units.includes(e) && !e.inside)) this.select(e); else this.deselect();
        return;
      }
      this.showPanelFor(this.sel); return;
    }
    const u = this.sel && !this.sel.isBld ? this.sel : null;
    if (u && u.owner === 0 && this.myTurn()) {
      // Angriff
      const tgt = this.attacks.find((t) => t.c === c && t.r === r);
      if (tgt) {
        if (this.pending === tgt) { await this.doAttack(tgt); return; }
        this.pending = tgt; this.r.hl.pending = tgt; this.showForecast(u, tgt); return;
      }
      // Einsteigen per Antippen eines eigenen Transporters
      const car = g.unitAt(c, r);
      if (car && car.owner === 0 && car !== u && UNITS[car.type].cap && g.canBoard(u, car)) { await this.run(() => g.board(u, car)); this.deselect(); return; }
      // Bewegung
      const v = this.reach && this.reach.get(g.idx(c, r));
      if (v && v.end && v.cost > 0 && !u.moved) {
        this.hideForecast();
        this.r.hl.move = null; this.r.hl.path = null;
        await this.run(() => g.moveUnit(u, c, r, this.reach));
        if (g.units.includes(u)) this.select(u); else this.deselect();
        return;
      }
    }
    // Auswahl
    const unit = g.unitAt(c, r);
    if (unit && (unit.owner === 0 || g.visibleTo(0, unit))) { this.select(unit); return; }
    const b = g.bAt(c, r);
    if (b && g.bVisibleTo(0, b)) { this.select(b); return; }
    const site = g.siteAt(c, r);
    this.deselect(false);
    if (g.fac(0) === 'marines' && g.terr(c, r) === 'pad') { this.showShop(g.lzPoint); return; }
    if (site && g.explored[g.idx(c, r)]) this.showSite(site); else this.showTerrain(c, r);
  }

  async run(fn) {
    this.busy = true;
    try { fn(); await this.play(); } finally { this.busy = false; }
    const st = this.g.checkEnd();
    if (st) this.showEnd(); else this.refresh();
  }

  select(e) {
    const g = this.g;
    this.sel = e; this.pending = null; this.r.hl.pending = null; this.hideForecast();
    this.r.hl.sel = e; this.r.hl.path = null; this.r.hl.target = [];
    this.reach = null; this.attacks = [];
    if (!e.isBld && e.owner === 0 && this.myTurn() && !e.inside) {
      if (!e.moved && !e.acted) this.reach = g.reachable(e);
      if (!e.acted) this.attacks = g.targetsFrom(e, e.c, e.r, true);
    }
    this.r.hl.move = this.reach; this.r.hl.attack = this.attacks;
    this.showPanelFor(e);
  }
  deselect(hide = true) {
    this.sel = null; this.reach = null; this.attacks = []; this.pending = null; this.tmode = null;
    Object.assign(this.r.hl, { move: null, attack: [], target: [], path: null, sel: null, pending: null });
    this.hideForecast();
    if (hide) $('#panel').classList.remove('show');
  }
  async doAttack(t) {
    const u = this.sel; if (!u || !this.myTurn()) return;
    this.hideForecast();
    await this.run(() => this.g.attack(u, t));
    if (this.g.units.includes(u)) this.select(u); else this.deselect();
  }
  showForecast(u, t) {
    const f = this.g.forecast(u, t), el = $('#forecast'), max = this.g.maxHp(t);
    el.querySelector('.fc-title').textContent = `${UNITS[u.type].name} → ${t.isBld ? BUILDINGS[t.type].name : UNITS[t.type].name}`;
    el.querySelector('.fc-dmg').textContent = `${f.dmg} von ${t.hp}${f.kill ? ' · vernichtet' : ''}`;
    el.querySelector('.fc-ctr').textContent = f.kill ? '—' : f.ctr ? `${f.ctr} von ${u.hp}` : 'keiner';
    el.querySelector('.fc-extra').textContent = !t.isBld && this.g.isXeno(t) && t.type !== 'ei' && f.kill ? 'Säurespritzer treffen Nachbarfelder!' : '';
    el.classList.add('show');
    void max;
  }
  hideForecast() { $('#forecast').classList.remove('show'); }

  setTarget(hexes, cb, msg) {
    if (!hexes.length) return;
    this.tmode = { hexes, cb };
    this.r.hl.target = hexes; this.r.hl.move = null; this.r.hl.attack = [];
    this.hideForecast();
    this.logMsg(msg + ' — Feld antippen (woanders: abbrechen).', 'info');
  }

  // ---------- Panels ----------
  chip(txt, cls = '') { return `<span class="chip ${cls}">${txt}</span>`; }
  head(kind, type, col, name, sub, hp, max) {
    return `<div class="p-head"><span class="p-ic" data-ic="${kind}|${type}|${col}"></span><div><div class="p-name">${name}</div><div class="p-sub" style="color:${col}">${sub}</div>${max ? `<div class="hpbar"><i style="width:${Math.max(0, hp / max * 100)}%;background:${hp / max > 0.6 ? '#6fdc6a' : hp / max > 0.3 ? '#ffc040' : '#ff5a40'}"></i></div>` : ''}</div><button class="x" data-act="close">×</button></div>`;
  }
  paintIcons(el) { el.querySelectorAll('[data-ic]').forEach((s) => { const [k, t, c] = s.dataset.ic.split('|'); s.replaceWith(iconCanvas(k, t, c, s.classList.contains('small') ? 46 : 60, s.classList.contains('small') ? 34 : 45)); }); }

  showPanelFor(e) {
    if (!e) return $('#panel').classList.remove('show');
    if (e.isBld) return this.showBuilding(e);
    return this.showUnit(e);
  }
  showUnit(u) {
    const g = this.g, d = UNITS[u.type], col = FACTIONS[g.fac(u.owner)].color, own = u.owner === 0;
    const chips = [this.chip(`LP ${u.hp}/${d.hp}`)];
    if (d.atk) chips.push(this.chip(`Angriff ${d.atk} · Rw ${d.rng[0] === d.rng[1] ? d.rng[1] : d.rng.join('–')}`));
    chips.push(this.chip(`Bew ${g.moveOf(u)}`));
    if (d.armor) chips.push(this.chip(`Panzer ${Math.round(d.armor * 100)} %`));
    if (d.tracker) chips.push(this.chip(`Melder ${d.tracker}`, 'trk'));
    if (d.ammo && own) chips.push(this.chip(`Mun ${u.ammo}/${d.ammo}`, u.ammo <= 1 ? 'warn' : ''));
    if (u.flares) chips.push(this.chip(`Fackeln ${u.flares}`));
    if (u.host) chips.push(this.chip(`☣ Befallen · ${u.host.t} ${u.host.t === 1 ? 'Runde' : 'Runden'}`, 'bad'));
    if (d.cap) chips.push(this.chip(`Ladung ${g.cargoUsed(u)}/${d.cap}`));
    if (u.type === 'synth') chips.push(u.defected ? this.chip('Konzernbefehl — übergelaufen', 'bad') : own ? this.chip(u.scanned ? 'Loyalität geprüft ✓' : 'Loyalität ungeprüft', u.scanned ? 'trk' : 'warn') : this.chip('Loyalität unbekannt'));
    if (u.type === 'schiff') chips.push(this.chip(u.landed ? 'gelandet' : 'in der Luft'));
    if (own && g.current.id === 0) chips.push(this.chip(u.acted ? 'fertig' : u.moved ? 'gezogen' : 'bereit', u.acted ? 'dim' : ''));
    let html = this.head('unit', u.type, col, d.name, own ? 'Eigene Einheit' : g.players[u.owner].name, u.hp, d.hp);
    html += `<div class="chips">${chips.join('')}</div><div class="p-desc">${d.desc}</div>`;
    if (u.host && own) html += `<div class="p-warn">Zur ${g.fac(0) === 'siedler' ? 'Krankenstation' : 'Sanitätszelt oder ins gelandete Landungsschiff'} — sonst schlüpft am Rundenende in ${u.host.t} ${u.host.t === 1 ? 'Runde' : 'Runden'} ein Brutling.</div>`;
    if (u.cargo.length) html += `<div class="p-cargo">${u.cargo.map((id) => { const x = g.units.find((o) => o.id === id); return x ? `<span>${UNITS[x.type].name}${x.host ? ' ☣' : ''}</span>` : ''; }).join('')}</div>`;
    const acts = own && this.myTurn() ? this.unitActions(u) : [];
    if (acts.length) html += `<div class="p-actions">${acts.map((a) => `<button data-act="${a.id}" class="${a.cls || ''}" title="${a.tip || ''}">${a.label}</button>`).join('')}</div>`;
    if (own && this.myTurn() && !u.acted && this.attacks.length) html += `<div class="p-hint">Rote Markierung: angreifbar (zweimal antippen).</div>`;
    const el = $('#panel'); el.innerHTML = html; this.paintIcons(el); el.classList.add('show');
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
    for (const a of acts) { const b = el.querySelector(`[data-act="${a.id}"]`); if (b) b.onclick = a.fn; }
  }
  unitActions(u) {
    const g = this.g, A = [], d = UNITS[u.type];
    if (u.inside) return A;
    if (u.cargo.length && g.canUnload(u)) A.push({ id: 'unload', label: `⬇ Aussteigen (${u.cargo.length})`, fn: () => this.run(() => g.unloadAll(u)).then(() => this.select(u)) });
    if (u.type === 'schiff') {
      if (g.canLand(u)) A.push({ id: 'land', label: '🛬 Landen', tip: 'Beendet den Zug. Gelandet: aufnehmen, absetzen, Nachschub, Befall heilen.', fn: () => this.run(() => g.land(u)).then(() => this.select(u)) });
    }
    if (!u.acted && d.cls === 'inf') {
      const cars = g.units.filter((c) => c.owner === 0 && g.canBoard(u, c));
      if (cars.length) A.push({ id: 'board', label: '⬆ Einsteigen', fn: () => cars.length === 1 ? this.run(() => g.board(u, cars[0])).then(() => this.deselect()) : this.setTarget(cars.map((c) => [c.c, c.r]), (c, r) => { const car = g.unitAt(c, r); if (car) g.board(u, car); this.deselect(); }, 'Transporter wählen') });
    }
    if (g.flareHexes(u).length) A.push({ id: 'flare', label: `✦ Leuchtfackel (${u.flares})`, tip: 'Leuchtet 2 Felder für 2 Runden aus: Die Brut wird dort sichtbar.', fn: () => this.setTarget(g.flareHexes(u), (c, r) => { g.flare(u, c, r); }, 'Leuchtfackel: Ziel in 4 Feldern') });
    const wt = g.weldTargets(u);
    if (wt.length) A.push({ id: 'weld', label: '⚙ Verschweißen', tip: 'Schacht dicht machen: Die Brut kann ihn nicht mehr nutzen, bis ein Jäger ihn aufbricht.', fn: () => wt.length === 1 ? this.run(() => g.weld(u, wt[0])).then(() => this.select(u)) : this.setTarget(wt.map((v) => [v.c, v.r]), (c, r) => g.weld(u, g.ventAt(c, r)), 'Schacht wählen') });
    const ct = g.crawlTargets(u);
    if (ct.length) A.push({ id: 'crawl', label: '⇣ Durch den Schacht', tip: g.fac(0) === 'siedler' ? 'Bis zu 2 Knoten weit.' : '1 Knoten weit.', fn: () => this.setTarget(ct.map((v) => [v.c, v.r]), (c, r) => g.crawl(u, g.ventAt(c, r)), 'Ausgang wählen') });
    if (d.abil?.includes('build') && !u.acted) A.push({ id: 'build', label: '🏗 Bauen', fn: () => this.showBuildMenu(u) });
    const fh = g.fobHexes(u);
    if (fh.length) A.push({ id: 'fob', label: `⚑ FOB errichten (${BUILDINGS.fob.cost})`, tip: 'Mindestens 5 Felder von anderen FOBs, höchstens 3.', fn: () => this.setTarget(fh, (c, r) => g.build(u, 'fob', c, r), 'FOB-Standort wählen') });
    const ht = g.healTargets(u);
    if (ht.length) A.push({ id: 'heal', label: '✚ Heilen', tip: 'Verletzte +4, Befallene: +1 Runde (einmalig).', fn: () => ht.length === 1 ? this.run(() => g.heal(u, ht[0])).then(() => this.select(u)) : this.setTarget(ht.map((t) => [t.c, t.r]), (c, r) => { const t = ht.find((x) => x.c === c && x.r === r); if (t) g.heal(u, t); }, 'Wen versorgen?') });
    const rt = g.repairTargets(u);
    if (rt.length) A.push({ id: 'repair', label: '🔧 Instandsetzen', tip: 'Geschütze nachladen, Bauten +6, Fahrzeuge +5.', fn: () => rt.length === 1 ? this.run(() => g.repair(u, rt[0])).then(() => this.select(u)) : this.setTarget(rt.map((t) => [t.c, t.r]), (c, r) => { const t = rt.find((x) => x.c === c && x.r === r); if (t) g.repair(u, t); }, 'Was instand setzen?') });
    const sc = g.scanTargets(u);
    if (sc.length) A.push({ id: 'scan', label: '🔍 Synthetiker scannen', tip: 'Zeigt die Loyalität. Steckt ein Konzernbefehl in ihm, wendet er sich sofort gegen euch.', fn: () => this.run(() => g.scan(u, sc[0])).then(() => this.select(u)) });
    if (g.canCool(u)) A.push({ id: 'cool', label: `❄ Prozessor kühlen (+${CORE.cool})`, fn: () => this.run(() => g.cool(u)).then(() => this.select(u)) });
    if (d.abil?.includes('orbital')) {
      const oh = g.orbitalHexes(u), p = g.players[0];
      const why = p.credits < ORBITAL.cost ? `${ORBITAL.cost} nötig` : g.round < p.orbitalAt ? `bereit in ${p.orbitalAt - g.round} R.` : '';
      if (!u.acted) A.push({ id: 'orbital', label: `☄ Orbitalschlag${why ? ` (${why})` : ` (${ORBITAL.cost})`}`, cls: why ? 'dim' : 'danger', tip: 'Trifft ein sichtbares Feld in 6 Feldern und alle Nachbarn — auch eigene Einheiten. Brennt Harz weg, verschüttet Schächte.', fn: () => { if (oh.length) this.setTarget(oh, (c, r) => g.orbital(u, c, r), 'Orbitalschlag: Zielfeld wählen (Radius 1, trifft alles)'); else this.logMsg(`Orbitalschlag nicht bereit: ${why || 'kein Ziel in Sicht'}.`, 'warn'); } });
    }
    const ch = g.chargeHexes(u);
    if (ch.length) A.push({ id: 'charge', label: `💣 Sprengladung (${CHARGE.cost})`, tip: 'Zündet am Rundenende: trifft das Feld und alle Nachbarn, verschüttet einen Schacht dauerhaft.', fn: () => this.setTarget(ch, (c, r) => g.charge(u, c, r), 'Sprengladung: Nachbarfeld wählen') });
    const bt = g.burnTargets(u);
    if (bt.length) A.push({ id: 'burn', label: '🔥 Harz abbrennen', fn: () => this.setTarget(bt, (c, r) => g.burn(u, c, r), 'Harzfeld wählen') });
    if (!u.acted) A.push({ id: 'wait', label: '⏸ Warten', cls: 'dim', fn: () => { u.moved = u.acted = true; this.select(u); this.refresh(); } });
    return A;
  }
  showBuildMenu(u) {
    const g = this.g, f = g.fac(0), p = g.players[0];
    const el = $('#panel');
    const cards = BUILD_LIST[f].map((t) => {
      const d = BUILDINGS[t], hs = g.buildHexes(u, t);
      const why = p.credits < d.cost ? 'zu teuer' : !hs.length ? (f === 'siedler' ? 'nur nahe eigener Bauten' : 'nur im FOB-Umkreis') : '';
      return `<button class="card ${why ? 'locked' : ''}" data-b="${t}" ${why ? 'disabled' : ''}><span class="small" data-ic="bld|${t}|${FACTIONS[f].color}"></span><b>${d.name}</b><em>${d.cost}</em>${why ? `<i>${why}</i>` : ''}</button>`;
    }).join('');
    el.innerHTML = `${this.head('unit', u.type, FACTIONS[f].color, 'Bauen', `${FACTIONS[f].money}: ${Math.floor(p.credits)}`)}<div class="cards">${cards}</div><div class="p-desc" id="bdesc">Antippen zum Bauen — danach Feld neben dem ${UNITS[u.type].name} wählen.</div><div class="p-actions"><button data-act="back">Zurück</button></div>`;
    this.paintIcons(el);
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
    el.querySelector('[data-act="back"]').onclick = () => this.select(u);
    el.querySelectorAll('[data-b]').forEach((b) => {
      b.onmouseenter = () => { el.querySelector('#bdesc').textContent = BUILDINGS[b.dataset.b].desc; };
      b.onclick = () => { const t = b.dataset.b; el.querySelector('#bdesc').textContent = BUILDINGS[t].desc; this.setTarget(g.buildHexes(u, t), (c, r) => g.build(u, t, c, r), `${BUILDINGS[t].name} platzieren`); };
    });
  }
  showBuilding(b) {
    const g = this.g, d = BUILDINGS[b.type], col = FACTIONS[g.fac(b.owner)].color, own = b.owner === 0;
    const chips = [this.chip(`LP ${b.hp}/${d.hp}`)];
    if (b.progress) chips.push(this.chip(`im Bau · noch ${b.progress} ${b.progress === 1 ? 'Runde' : 'Runden'}`, 'warn'));
    if (d.sentry && own) chips.push(this.chip(`Munition ${b.ammo}/${d.sentry.ammo}`, b.ammo <= 2 ? 'warn' : ''));
    if (d.tracker) chips.push(this.chip(`Melder ${d.tracker}`, 'trk'));
    if (d.light) chips.push(this.chip(`Licht ${d.light}`));
    if (d.income) chips.push(this.chip(`+${d.income} je Runde`));
    let html = this.head('bld', b.type, col, d.name, own ? 'Eigener Bau' : g.players[b.owner].name, b.hp, d.hp);
    html += `<div class="chips">${chips.join('')}</div><div class="p-desc">${d.desc}</div>`;
    const el = $('#panel'); el.innerHTML = html; this.paintIcons(el); el.classList.add('show');
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
    if (own && !b.progress && g.buyList(0, b).length) this.appendShop(el, b);
  }
  showShop(sp) {
    const g = this.g;
    if (sp.isBld) return this.select(sp);
    const el = $('#panel');
    el.innerHTML = this.head('unit', 'schiff', FACTIONS[g.fac(0)].color, 'Landefeld · Nachschub', g.lzBlocked(0) ? 'Landefeld unter Feindkontakt — keine Landungen!' : 'Jede Anforderung kommt mit einem eigenen Lieferflug');
    this.appendShop(el, sp);
    this.paintIcons(el); el.classList.add('show');
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
  }
  appendShop(el, sp) {
    const g = this.g, p = g.players[0], f = g.fac(0), col = FACTIONS[f].color;
    const list = g.buyList(0, sp);
    const left = g.spawnLimit(sp) - (sp.spawned || 0);
    const cards = list.map((t) => {
      const d = UNITS[t], ok = this.myTurn() && g.canBuy(0, t, sp);
      let why = '';
      if (!ok) why = p.credits < d.cost ? 'zu teuer' : t === 'schiff' ? (g.lzBlocked(0) ? 'Feind am LZ' : 'max. 2') : left <= 0 ? 'Limit' : sp.isLz && g.lzBlocked(0) ? 'Feind am LZ' : 'kein Platz';
      return `<button class="card ${ok ? '' : 'locked'}" data-u="${t}" ${ok ? '' : 'disabled'}><span class="small" data-ic="unit|${t}|${col}"></span><b>${d.name}</b><em>${d.cost}</em>${why ? `<i>${why}</i>` : ''}</button>`;
    }).join('');
    const box = document.createElement('div');
    box.innerHTML = `<div class="p-title">Einheiten · noch ${Math.max(0, left)} diese Runde · ${FACTIONS[f].money} ${Math.floor(p.credits)}</div><div class="cards">${cards}</div><div class="p-desc" id="sdesc">Neue Einheiten sind ab der nächsten Runde einsatzbereit.${list.includes('schiff') ? ' Ein Landungsschiff als eigenes Gunboat kommt am Landefeld an (höchstens 2).' : ''}</div>`;
    el.appendChild(box);
    this.paintIcons(box);
    box.querySelectorAll('[data-u]').forEach((b) => {
      b.onmouseenter = () => { box.querySelector('#sdesc').textContent = UNITS[b.dataset.u].desc; };
      b.onclick = async () => {
        let u = null; await this.run(() => { u = g.buy(0, b.dataset.u, sp); });
        if (u) this.logMsg(`${UNITS[u.type].name} angefordert.`, 'good');
        sp.isBld ? this.showBuilding(sp) : this.showShop(sp);
      };
    });
  }
  showSite(s) {
    const g = this.g, d = SITES[s.type];
    const owner = s.owner >= 0 ? g.players[s.owner].name : 'niemand';
    const col = s.owner >= 0 ? FACTIONS[g.fac(s.owner)].color : '#bbb';
    let html = this.head('site', s.type, col, d.name, `Besitzer: ${owner}`);
    html += `<div class="chips">${this.chip(`${d.pts} ${d.pts === 1 ? 'Punkt' : 'Punkte'} je Runde`)}${this.chip(`+${d.income}`)}${s.owner >= 0 ? this.chip(s.manned ? 'besetzt' : 'unbesetzt — keine Punkte', s.manned ? '' : 'warn') : ''}${s.blocked ? this.chip('von der Brut blockiert', 'bad') : ''}${s.type === 'prozessor' && g.core != null ? this.chip(`Überhitzt · Kernschmelze in ${g.core}`, 'bad') : ''}</div>`;
    html += `<div class="p-desc">${d.desc} Einnehmen: am Rundenende mit einer Einheit auf dem Feld stehen, ohne Gegner daneben. Punkte gibt es nur, solange eine eigene Einheit daneben steht oder ein eigenes Geschütz/FOB in 2 Feldern.</div>`;
    const el = $('#panel'); el.innerHTML = html; this.paintIcons(el); el.classList.add('show');
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
  }
  showTerrain(c, r) {
    const g = this.g, i = g.idx(c, r);
    if (!g.explored[i]) { $('#panel').classList.remove('show'); return; }
    const T = TERRAIN[g.terr(c, r)];
    const chips = [this.chip(`Bewegung ${T.mv ?? '—'}${T.veh == null ? ' · keine Fahrzeuge' : ''}`), this.chip(`Deckung ${Math.round(T.cover * 100)} %`)];
    if (T.sight) chips.push(this.chip(`Sicht +${T.sight}`));
    if (g.resin[i]) chips.push(this.chip('Harz: +1 Bewegung, Brut regeneriert', 'bad'));
    if (g.acid[i] >= g.round) chips.push(this.chip('Säure: 2 Schaden', 'bad'));
    if (g.fire[i] >= g.round) chips.push(this.chip('Feuer: 3 Schaden', 'warn'));
    const v = g.ventAt(c, r);
    if (v && g.knowsVent(0, v)) chips.push(this.chip(`Schacht${v.sealed ? ' (verschweißt)' : ''} · ${v.links.length} Verbindungen`, 'trk'));
    const bl = g.blips.find((b) => b.c === c && b.r === r);
    if (bl) chips.push(this.chip(bl.vent ? 'Melder: Bewegung im Schacht' : 'Melder: Bewegung', 'trk'));
    const el = $('#panel');
    el.innerHTML = `<div class="p-head"><div><div class="p-name">${T.name}</div><div class="p-sub">Feld ${c}/${r}</div></div><button class="x" data-act="close">×</button></div><div class="chips">${chips.join('')}</div>`;
    el.classList.add('show');
    el.querySelector('[data-act="close"]').onclick = () => this.deselect();
  }

  // ---------- Oberfläche ----------
  bindDom() {
    $('#endturn').onclick = () => this.endTurn();
    $('#nextunit').onclick = () => this.nextUnit();
    $('#ventbtn').onclick = () => this.toggleVents();
    $('#basebtn').onclick = () => this.jumpHome();
    $('#helpbtn').onclick = () => $('#help').classList.add('show');
    $('#objbtn').onclick = () => this.showObjective();
    $('#help .close').onclick = () => $('#help').classList.remove('show');
    $('#zoomin').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1.2);
    $('#zoomout').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1 / 1.2);
    $('#speedbtn').onclick = () => { this.speed = this.speed >= 4 ? 1 : this.speed * 2; localStorage.setItem('schachtbrut-speed', this.speed); this.refresh(); };
    $('#gamemenu').onclick = () => this.hooks.menu && this.hooks.menu();
    $('#fc-ok').onclick = () => this.pending && this.doAttack(this.pending);
    $('#fc-no').onclick = () => { this.pending = null; this.r.hl.pending = null; this.hideForecast(); };
  }
  toggleVents() { this.r.showVents = !this.r.showVents; $('#ventbtn').classList.toggle('on', this.r.showVents); }
  jumpHome() {
    const g = this.g;
    if (g.fac(0) === 'marines') { const L = g.map.lz, p = center(L.c, L.r); this.r.centerOn(p.x, p.y, true); this.deselect(false); this.showShop(g.lzPoint); return; }
    const z = g.buildings.find((b) => b.owner === 0 && (b.type === 'zentrale' || b.type === 'fob'));
    const s = g.units.find((u) => u.owner === 0 && u.type === 'schiff');
    const t = z || s;
    if (!t) return;
    const p = center(t.c, t.r); this.r.centerOn(p.x, p.y, true);
    if (t.isBld) this.select(t); else this.select(t);
  }
  nextUnit() {
    if (!this.myTurn()) return;
    const g = this.g;
    const mine = g.units.filter((u) => u.owner === 0 && !u.inside && !u.acted && (!u.moved || g.targetsFrom(u, u.c, u.r, true).length));
    if (!mine.length) { this.logMsg('Alle Einheiten haben gehandelt.', 'info'); return; }
    const i = this.sel ? (mine.indexOf(this.sel) + 1) % mine.length : 0;
    const u = mine[i] || mine[0];
    const p = center(u.c, u.r); this.r.centerOn(p.x, p.y, true);
    this.select(u);
  }
  logMsg(text, kind = 'info') {
    const el = document.createElement('div'); el.className = `msg ${kind}`; el.textContent = text;
    const log = $('#log'); log.appendChild(el);
    while (log.children.length > 5) log.firstChild.remove();
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 600); }, 7000);
  }
  async banner(main, sub = '', dur = 1.3) {
    const b = $('#banner');
    b.innerHTML = `<div class="b-main">${main}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
    b.classList.add('show');
    await sleep(dur * 1000 / Math.max(1, this.speed > 1 && this.g.current.id !== 0 ? 2 : 1));
    b.classList.remove('show');
  }
  refresh() {
    const g = this.g, p = g.players[0], f = g.fac(0), foe = g.players[1];
    $('#round').textContent = g.round;
    $('#cashlbl').textContent = FACTIONS[f].money;
    $('#credits').textContent = Math.floor(p.credits);
    $('#score').innerHTML = `<span class="sc" style="--c:${FACTIONS[f].color}"><b>${p.score}</b><i>${FACTIONS[f].short}</i></span><span class="sc" style="--c:${FACTIONS[foe.faction].color}"><b>${foe.score}</b><i>${FACTIONS[foe.faction].short}${foe.out ? ' ✝' : ''}</i></span><span class="sc-t">Ziel ${g.target}</span>`;
    const bf = Math.min(100, g.befall);
    $('#befall').innerHTML = `<span class="lbl">Befall · Stufe ${g.stage}</span><div class="bbar"><i style="width:${bf}%"></i></div><em>${Math.floor(bf)} %</em>`;
    $('#befall').title = `${STAGE_NAMES[g.stage]} — bei 100 % verhängt der Orbit die Quarantäne: alle verlieren.`;
    $('#befall').classList.toggle('hot', bf >= 75);
    $('#storm').style.display = g.storm.active ? '' : 'none';
    $('#core').style.display = g.core != null ? '' : 'none';
    if (g.core != null) $('#core b').textContent = `${g.core} R.`;
    const pr = g.objProgress(0);
    if (pr) { $('#objbtn').innerHTML = `🎯 ${pr.done ? '✓' : pr.text.split(' · ')[0]}`; $('#objbtn').classList.toggle('done', pr.done); }
    $('#speedbtn').textContent = `⏩ ${this.speed}×`;
    const mine = g.current.id === 0 && !g.state;
    $('#endturn').disabled = !mine || this.busy;
    $('#endturn').textContent = mine ? 'Runde beenden' : `${g.current.name} …`;
    const left = g.units.filter((u) => u.owner === 0 && !u.inside && !u.acted && !u.moved).length;
    $('#nextunit').textContent = `Nächste (${left})`;
    if (this.sel && $('#panel').classList.contains('show') && !this.tmode && !this.busy) {
      if (this.sel.isBld ? g.buildings.includes(this.sel) : g.units.includes(this.sel)) { /* Panel bleibt */ } else this.deselect();
    }
  }

  // ---------- Rundenablauf ----------
  async endTurn() {
    const g = this.g;
    if (!this.myTurn()) return;
    const idle = g.units.filter((u) => u.owner === 0 && !u.inside && !u.moved && !u.acted).length;
    void idle;
    this.deselect();
    this.busy = true; this.refresh();
    try {
      g.endTurn(); await this.play();
      while (!g.state && g.current.id !== 0) {
        const pid = g.current.id;
        this.refresh();
        for (const step of aiTurn(g, pid)) { void step; await this.play(); if (g.state) break; }
        await this.play();
        if (g.state) break;
        g.endTurn(); await this.play();
      }
    } finally { this.busy = false; }
    if (g.state) { this.showEnd(); return; }
    this.hooks.save && this.hooks.save();
    this.refresh();
    const nb = g.blips.length;
    await this.banner(`Runde ${g.round}`, nb ? `Melder: ${nb} ${nb === 1 ? 'Bewegung' : 'Bewegungen'}` : 'Melder: keine Bewegung', 1.1);
    const hosts = g.units.filter((u) => u.owner === 0 && u.host);
    for (const h of hosts) this.logMsg(`☣ ${UNITS[h.type].name}: noch ${h.host.t} ${h.host.t === 1 ? 'Runde' : 'Runden'} bis zum Ausbruch!`, 'bad');
  }
  showObjective(pick = false) {
    const g = this.g, el = $('#objbox'), p = g.players[0];
    const card = (k, sel) => { const o = OBJECTIVES[k]; return `<button class="objcard ${sel ? 'on' : ''}" data-k="${k}"><b>${o.name}</b><em>+${o.pts} Punkte</em><span>${o.desc}</span></button>`; };
    let html = `<div class="box"><button class="close">×</button><h2>${pick ? 'Geheimziel wählen' : 'Geheimziel'}</h2>`;
    if (pick) html += `<p class="m-hint">Nur ihr kennt euer Ziel. Erfüllt bringt es Punkte und 300 ${FACTIONS[p.faction].money}. Die Gegenseite hat ebenfalls eines — ihr erfahrt es erst, wenn sie es erfüllt.</p><div class="objgrid">${g.objOffer.map((k, i) => card(k, i === 0)).join('')}</div>`;
    else {
      const pr = g.objProgress(0);
      html += `<div class="objgrid">${card(p.obj.key, true)}</div><div class="m-label">Fortschritt</div><div class="objprog">${pr.done ? 'Erfüllt ✓' : pr.text}</div><p class="m-hint">Die ${FACTIONS[g.players[1].faction].short} verfolgen ein eigenes, geheimes Ziel${g.players[1].obj?.done ? `: <b>${OBJECTIVES[g.players[1].obj.key].name}</b> (erfüllt)` : '.'}</p>`;
    }
    el.innerHTML = html + '</div>';
    el.classList.add('show');
    el.querySelector('.close').onclick = () => { if (pick && g.objOffer.length) g.chooseObjective(g.objOffer[0]); el.classList.remove('show'); this.refresh(); };
    if (pick) el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { g.chooseObjective(b.dataset.k); el.classList.remove('show'); this.hooks.save && this.hooks.save(); this.refresh(); this.logMsg(`Geheimziel: ${OBJECTIVES[b.dataset.k].name}`, 'good'); });
  }
  showEnd() {
    const g = this.g, st = g.state;
    if (!st || this.ended) return;
    this.ended = true;
    this.hooks.clearSave && this.hooks.clearSave();
    const el = $('#endscreen');
    let h1, txt;
    if (st.kind === 'meltdown') { h1 = 'Kernschmelze'; txt = 'Der Atmosphäreprozessor ist explodiert. Niemand überlebt — es gibt keine Sieger.'; }
    else if (st.kind === 'quarantine') { h1 = 'Quarantäne'; txt = 'Der Befall hat 100 % erreicht. Der Orbit sterilisiert die Kolonie — es gibt keine Sieger.'; }
    else if (st.winner === 0) { h1 = 'Sieg'; txt = `${g.players[0].name}: ${st.why}`; }
    else { h1 = 'Niederlage'; txt = `${g.players[st.winner].name}: ${st.why}`; }
    el.querySelector('h1').textContent = h1;
    el.querySelector('.stats').innerHTML = `${txt}<br>Runde ${g.round} · Punkte ${g.players[0].score}:${g.players[1].score} · Befall ${Math.floor(g.befall)} % · Ausbrüche ${g.bursts}<br>Geheimziel ${OBJECTIVES[g.players[0].obj.key].name}: ${g.players[0].obj.done ? 'erfüllt' : 'nicht erfüllt'} · Gegenseite: ${OBJECTIVES[g.players[1].obj.key].name}${g.players[1].obj.done ? ' (erfüllt)' : ''}`;
    el.classList.add('show');
  }
}
