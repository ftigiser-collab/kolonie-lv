// Regelwerk: Züge, Bewegung, Kampf, Melder-Nebel, Schächte, Brut, Befall
import { UNITS, BUILDINGS, TERRAIN, SITES, FACTIONS, START_CASH, BOUNTY, HOST_TIME, LIGHT_FLARE, STAGE_NAMES, MARINE_BUY, OBJECTIVES, SLEEPER_CHANCE, ORBITAL, CHARGE, CORE } from './data.js';
import { neighbors, distance, ring } from './hex.js';


class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}

const SPAWN_LIMIT = { zentrale: 3, werkstatt: 1, fob: 3, schiff: 2, lz: 3 };

export class Game {
  constructor(map, opts = {}) {
    this.map = map; this.W = map.W; this.H = map.H;
    this.round = 1; this.tick = 0; this.nextId = 1;
    this.diff = opts.diff || { aiCash: 1, brood: 1 };
    this.target = opts.target || 30;
    const fac = opts.faction || 'siedler', other = fac === 'siedler' ? 'marines' : 'siedler';
    this.players = [fac, other, 'brut'].map((f, id) => ({ id, faction: f, ai: id !== 0, name: FACTIONS[f].name, credits: f === 'brut' ? 0 : START_CASH * (id === 0 ? 1 : this.diff.aiCash), score: 0, out: false, turnTick: 0, orbitalAt: 0, obj: null, stats: { xeno: 0, eggs: 0, resin: 0, bld: 0, ships: 0, mother: 0, labor: 0, funk: 0 } }));
    this.units = []; this.buildings = [];
    this.sites = map.sites.map((s, i) => ({ ...s, id: i, owner: -1, blocked: false }));
    this.vents = map.vents.map((v) => ({ ...v, links: [...v.links], sealed: false }));
    const n = this.W * this.H;
    this.resin = new Uint8Array(n); this.fire = new Uint16Array(n); this.acid = new Uint16Array(n);
    this.flares = []; this.charges = []; this.core = null; this.objOffer = [];
    this.lzPoint = { id: -1, isLz: true, type: 'lz', c: map.lz.c, r: map.lz.r, spawned: 0 };
    this.befall = 0; this.biomass = 8; this.bursts = 0; this.motherSpawned = false;
    this.storm = { active: false, until: 0, next: 7 + Math.floor(Math.random() * 4) };
    this.events = []; this.log = [];
    this.explored = new Uint8Array(n);
    this.ventSeen = new Set();
    this.vis = {}; this.blips = [];
    this.state = null; this.cur = 0;
    this.order = this.roundOrder();
  }

  // ---------- Grundlagen ----------
  idx(c, r) { return r * this.W + c; }
  inb(c, r) { return c >= 0 && r >= 0 && c < this.W && r < this.H; }
  terr(c, r) { return this.map.t[this.idx(c, r)]; }
  def(u) { return UNITS[u.type]; }
  bdef(b) { return BUILDINGS[b.type]; }
  fac(owner) { return this.players[owner].faction; }
  say(text, kind = 'info') { this.log.push({ text, kind, round: this.round }); if (this.log.length > 60) this.log.shift(); this.events.push({ type: 'msg', text, kind }); }
  get stage() { return Math.min(4, 1 + Math.floor(this.befall / 25)); }
  get current() { return this.players[this.order[Math.min(this.cur, this.order.length - 1)]]; }
  roundOrder() { return this.round % 2 ? [0, 1, 2] : [1, 0, 2]; }

  unitAt(c, r, withVent = false) { return this.units.find((u) => u.c === c && u.r === r && !u.inside && (withVent || !u.inVent)); }
  bAt(c, r) { return this.buildings.find((b) => b.c === c && b.r === r); }
  siteAt(c, r) { return this.sites.find((s) => s.c === c && s.r === r); }
  ventAt(c, r) { return this.vents.find((v) => v.c === c && v.r === r); }
  onMap(u) { return !u.inside && !u.inVent; }
  isXeno(u) { const k = this.def(u).cls; return k === 'xeno' || k === 'egg'; }
  flying(u) { return this.def(u).cls === 'air' && !u.landed; }
  enemies(a, b) { return a !== b; }
  unitsOf(o) { return this.units.filter((u) => u.owner === o); }
  maxHp(e) { return e.isBld ? this.bdef(e).hp : this.def(e).hp; }

  addUnit(owner, type, c, r) {
    const d = UNITS[type];
    const u = { id: this.nextId++, type, owner, c, r, hp: d.hp, moved: false, acted: false, face: Math.random() * 6.28, lastMove: 0, revealUntil: 0, cargo: [], inside: null, inVent: false };
    if (d.ammo) u.ammo = d.ammo;
    if (d.flares) u.flares = d.flares;
    if (type === 'brutling') u.grow = 2;
    this.units.push(u);
    return u;
  }
  addBuilding(owner, type, c, r, progress = 0) {
    const d = BUILDINGS[type];
    const b = { id: this.nextId++, isBld: true, type, owner, c, r, hp: d.hp, progress, spawned: 0, fired: [] };
    if (d.sentry) b.ammo = d.sentry.ammo;
    this.buildings.push(b);
    return b;
  }

  // ---------- Aufbau ----------
  setup() {
    const m = this.map;
    const S = this.players.find((p) => p.faction === 'siedler').id, M = this.players.find((p) => p.faction === 'marines').id;
    for (const b of m.prebuilt) this.addBuilding(S, b.type, b.c, b.r, 0);
    const z = m.colony;
    for (const t of ['miliz', 'miliz', 'miliz', 'spaeher', 'techniker', 'brenner']) { const h = this.freeHexNear(z.c, z.r, t, 4); if (h) this.addUnit(S, t, h[0], h[1]); }
    const pads = ring(m.lz.c, m.lz.r, 1, this.W, this.H).filter(([c, r]) => this.terr(c, r) === 'pad');
    void pads;
    for (const t of ['schuetze', 'schuetze', 'unteroff', 'smartgun', 'pionier', 'sani']) { const h = this.freeHexNear(m.lz.c, m.lz.r, t, 4); if (h) this.addUnit(M, t, h[0], h[1]); }
    // Brut: Nest, Harz, Eier, zwei Läufer in den Schächten
    for (const [c, r] of ring(m.nest.c, m.nest.r, 2, this.W, this.H)) if (this.terr(c, r) !== 'chasm') this.resin[this.idx(c, r)] = 1;
    for (const v of this.vents.filter((v) => v.kind === 'nest')) for (const [c, r] of ring(v.c, v.r, 1, this.W, this.H)) if (this.terr(c, r) !== 'chasm') this.resin[this.idx(c, r)] = 1;
    const eggSpots = ring(m.nest.c, m.nest.r, 2, this.W, this.H).filter(([c, r]) => distance(c, r, m.nest.c, m.nest.r) >= 1 && !this.ventAt(c, r) && this.terr(c, r) !== 'chasm').sort(() => Math.random() - 0.5);
    { const h = this.freeHexNear(m.nest.c, m.nest.r, 'knoten', 2); if (h) this.addUnit(2, 'knoten', h[0], h[1]); }
    for (const [c, r] of eggSpots.slice(0, 5)) if (!this.unitAt(c, r)) this.addUnit(2, 'ei', c, r);
    const nv = this.vents.filter((v) => v.kind === 'nest'), cv = this.vents.filter((v) => v.kind === 'cave').sort((a, b) => distance(a.c, a.r, this.W / 2, this.H / 2) - distance(b.c, b.r, this.W / 2, this.H / 2));
    for (const v of [nv[0], cv[0] || nv[1], cv[1]]) if (v) { const u = this.addUnit(2, 'laeufer', v.c, v.r); u.inVent = true; u.ventId = v.id; }
    this.players[2].credits = this.biomass;
    this.assignObjectives();
    this.beginTurn();
  }

  freeHexNear(c, r, type, maxR = 3) {
    for (let d = 1; d <= maxR; d++) {
      const opts = ring(c, r, d, this.W, this.H).filter(([x, y]) => distance(c, r, x, y) === d && this.canStand(type, x, y)).sort(() => Math.random() - 0.5);
      if (opts.length) return opts[0];
    }
    return null;
  }
  canStand(type, c, r) {
    if (!this.inb(c, r) || this.unitAt(c, r) || this.bAt(c, r)) return false;
    const d = UNITS[type], T = TERRAIN[this.terr(c, r)];
    if (d.cls === 'air') return true;
    if (d.cls === 'veh') return T.veh != null;
    return T.mv != null;
  }

  // ---------- Züge ----------
  beginTurn() {
    const p = this.current;
    this.lastSince = p.turnTick;
    p.turnTick = ++this.tick;
    for (const u of this.units) if (u.owner === p.id) { u.moved = false; u.acted = false; u.mvLeft = null; u.watchReady = true; }
    for (const b of this.buildings) { if (b.owner === p.id) b.spawned = 0; b.fired = []; }
    if (p.faction === 'marines') this.lzPoint.spawned = 0;
    if (p.faction === 'marines') this.resupply(p.id);
    this.computeVis(p.id);
    if (p.id === 0) { this.computeVis(0); this.makeBlips(this.lastSince); }
    this.events.push({ type: 'turn', pid: p.id });
  }

  endTurn() {
    if (this.state) return;
    this.cur++;
    while (this.cur < this.order.length && this.players[this.order[this.cur]].out) this.cur++;
    if (this.cur >= this.order.length) {
      this.endRound();
      if (this.state) { this.cur = 0; return; }
      this.round++; this.order = this.roundOrder(); this.cur = 0;
      while (this.players[this.order[this.cur]].out) this.cur++;
    }
    this.beginTurn();
  }

  resupply(pid) {
    for (const u of this.units) {
      if (u.owner !== pid) continue;
      const d = this.def(u);
      if (!d.ammo) continue;
      const host = u.inside ? this.units.find((x) => x.id === u.inside) : null;
      const c = host ? host.c : u.c, r = host ? host.r : u.r;
      const atPad = this.terr(c, r) === 'pad';
      const atFob = this.buildings.some((b) => b.owner === pid && b.type === 'fob' && !b.progress && distance(b.c, b.r, c, r) <= 1);
      const atDepot = this.buildings.some((b) => b.owner === pid && b.type === 'depot' && distance(b.c, b.r, c, r) <= 1);
      const atShip = (host && host.type === 'schiff' && host.landed) || this.units.some((s) => s.owner === pid && s.type === 'schiff' && s.landed && s !== u && distance(s.c, s.r, c, r) <= 1);
      if (atPad || atFob || atShip || atDepot) {
        if (u.ammo < d.ammo) { u.ammo = d.ammo; if (pid === 0) this.events.push({ type: 'float', c, r, text: 'Munition', color: '#9fd8ff' }); }
        if ((atPad || atFob) && d.flares) u.flares = d.flares;
      }
    }
  }

  // ---------- Sicht, Licht, Melder ----------
  computeLit() {
    const lit = new Uint8Array(this.W * this.H);
    const mark = (c, r, rad) => { for (const [x, y] of ring(c, r, rad, this.W, this.H)) lit[this.idx(x, y)] = 1; };
    for (const b of this.buildings) { const L = this.bdef(b).light; if (L && !b.progress) mark(b.c, b.r, L); }
    for (const f of this.flares) mark(f.c, f.r, f.rad);
    for (let i = 0; i < lit.length; i++) if (this.fire[i] >= this.round) lit[i] = 1;
    this.lit = lit;
    return lit;
  }
  sightOf(u) {
    const d = this.def(u), T = TERRAIN[this.terr(u.c, u.r)];
    let s = d.sight + (T.sight || 0) + (this.flying(u) ? 1 : 0);
    if (this.storm.active) s -= 1;
    return Math.max(1, s);
  }
  computeVis(pid) {
    const n = this.W * this.H, seen = new Uint8Array(n), trk = new Uint8Array(n);
    const mark = (arr, c, r, rad) => { if (rad <= 0) return; for (const [x, y] of ring(c, r, rad, this.W, this.H)) arr[this.idx(x, y)] = 1; };
    for (const u of this.units) {
      if (u.owner !== pid || u.inside || u.inVent) continue;
      mark(seen, u.c, u.r, this.sightOf(u));
      mark(trk, u.c, u.r, this.def(u).tracker || 0);
    }
    for (const b of this.buildings) {
      if (b.owner !== pid) continue;
      const d = this.bdef(b);
      mark(seen, b.c, b.r, Math.max(1, d.sight - (this.storm.active ? 1 : 0)));
      if (!b.progress) mark(trk, b.c, b.r, d.tracker || 0);
    }
    for (const f of this.flares) if (f.owner === pid) mark(seen, f.c, f.r, f.rad);
    for (const s of this.sites) if (s.owner === pid && SITES[s.type].tracker) mark(trk, s.c, s.r, SITES[s.type].tracker);
    this.computeLit();
    this.visV = (this.visV || 0) + 1;
    this.vis[pid] = { seen, trk, tick: this.tick };
    if (pid === 0) {
      for (let i = 0; i < n; i++) if (seen[i]) this.explored[i] = 1;
      for (const v of this.vents) if (seen[this.idx(v.c, v.r)]) this.ventSeen.add(v.id);
    }
    return this.vis[pid];
  }
  near(pid, c, r, d) {
    return this.units.some((u) => u.owner === pid && this.onMap(u) && distance(u.c, u.r, c, r) <= d) ||
      this.buildings.some((b) => b.owner === pid && distance(b.c, b.r, c, r) <= d);
  }
  visibleTo(pid, u) {
    if (u.owner === pid) return true;
    if (u.inside || u.inVent) return false;
    const v = this.vis[pid]; if (!v) return true;
    const i = this.idx(u.c, u.r);
    if (!v.seen[i]) return false;
    const cls = this.def(u).cls;
    if (cls === 'xeno') return !!this.lit[i] || u.revealUntil >= this.tick || this.near(pid, u.c, u.r, 2) || this.synthNear(pid, u.c, u.r, 3);
    if (cls === 'egg') return !!this.lit[i] || this.near(pid, u.c, u.r, 3);
    return true;
  }
  synthNear(pid, c, r, d) { return this.units.some((s) => s.owner === pid && s.type === 'synth' && this.onMap(s) && distance(s.c, s.r, c, r) <= d); }
  bVisibleTo(pid, b) { if (b.owner === pid) return true; const v = this.vis[pid]; return !v || v.seen[this.idx(b.c, b.r)] || this.explored[this.idx(b.c, b.r)]; }
  tracked(pid, c, r) { const v = this.vis[pid]; return v && v.trk[this.idx(c, r)]; }
  knowsVent(pid, v) { return this.fac(pid) === 'siedler' || (pid === 0 ? this.ventSeen.has(v.id) : true); }

  // Bewegungsmelder: alles, was sich seit dem letzten eigenen Zug bewegt hat, im Melderbereich, aber nicht zu sehen
  makeBlips(since) {
    this.blips = [];
    const v = this.vis[0];
    for (const u of this.units) {
      if (u.owner === 0 || u.inside) continue;
      if (this.visibleTo(0, u)) continue;
      const vent = u.inVent || (u.ventTick || 0) > since;
      if (u.lastMove <= since && !(u.inVent && (u.ventTick || 0) > since)) continue;
      if (!v.trk[this.idx(u.c, u.r)]) continue;
      let c = u.c, r = u.r;
      if (vent) { const nb = neighbors(c, r, this.W, this.H); const k = (u.id * 7 + this.round * 3) % (nb.length + 1); if (k < nb.length) [c, r] = nb[k]; }
      this.blips.push({ c, r, vent, uid: u.id });
    }
    // Fehlalarme: Dampf, Geröll, Wind
    const fakes = (Math.random() < 0.35 ? 1 : 0) + (Math.random() < 0.12 ? 1 : 0);
    for (let k = 0; k < fakes; k++) {
      for (let t = 0; t < 30; t++) {
        const c = Math.floor(Math.random() * this.W), r = Math.floor(Math.random() * this.H), i = this.idx(c, r);
        if (!v.trk[i] || v.seen[i] && this.near(0, c, r, 2) || this.terr(c, r) === 'chasm') continue;
        this.blips.push({ c, r, vent: Math.random() < 0.3, fake: true });
        break;
      }
    }
  }

  // ---------- Bewegung ----------
  moveOf(u) {
    if (u.mvLeft != null) return u.mvLeft;
    let m = this.def(u).mv;
    if (u.host) m = Math.max(2, m - 1);
    return m;
  }
  stepCost(u, c, r) {
    const d = this.def(u);
    if (d.cls === 'air') return 1;
    if (this.bAt(c, r)) return Infinity;
    const k = this.terr(c, r), T = TERRAIN[k], i = this.idx(c, r);
    let cost;
    if (d.cls === 'veh') cost = T.veh == null ? Infinity : T.veh;
    else if (d.cls === 'xeno') { cost = T.mv == null ? Infinity : Math.min(T.mv, 2); if (this.resin[i]) cost = 1; if (this.fire[i] >= this.round) cost += 3; }
    else cost = T.mv == null ? Infinity : T.mv;
    if (this.resin[i] && d.cls !== 'xeno') cost += 1;
    return cost;
  }
  // Hindernis aus Sicht des Ziehenden: Gegner nur, wenn bekannt (KI weiß alles)
  blocks(u, o) {
    if (!o || o === u) return false;
    if (this.flying(u)) return false;
    if (o.owner === u.owner) return false;
    if (this.flying(o)) return false;
    if (this.players[u.owner].ai) return true;
    return this.visibleTo(u.owner, o);
  }
  reachable(u, budget = this.moveOf(u)) {
    const res = new Map(), W = this.W;
    const k0 = this.idx(u.c, u.r);
    res.set(k0, { c: u.c, r: u.r, cost: 0, prev: -1 });
    const open = new Heap(); open.push([0, u.c, u.r]);
    while (open.size) {
      const [d, c, r] = open.pop();
      if (d > res.get(this.idx(c, r)).cost) continue;
      for (const [x, y] of neighbors(c, r, W, this.H)) {
        const cost = this.stepCost(u, x, y);
        if (!isFinite(cost)) continue;
        const nd = d + cost;
        if (nd > budget + 1e-6) continue;
        const occ = this.unitAt(x, y);
        if (this.blocks(u, occ)) continue;
        const k = this.idx(x, y), old = res.get(k);
        if (!old || nd < old.cost) { res.set(k, { c: x, r: y, cost: nd, prev: this.idx(c, r) }); open.push([nd, x, y]); }
      }
    }
    for (const [k, v] of res) {
      if (k === k0) { v.end = true; continue; }
      const occ = this.unitAt(v.c, v.r);
      v.end = !occ || (occ.owner !== u.owner && !this.blocks(u, occ) && !this.flying(u) && !this.flying(occ));
    }
    return res;
  }
  pathTo(reach, c, r) {
    const out = []; let k = this.idx(c, r);
    while (k >= 0 && reach.get(k) && reach.get(k).prev >= 0) { const v = reach.get(k); out.unshift([v.c, v.r]); k = v.prev; }
    return out;
  }
  // Abstandsfeld für die KI
  distField(u, tc, tr) {
    const W = this.W, n = W * this.H, dist = new Float64Array(n).fill(Infinity);
    dist[this.idx(tc, tr)] = 0;
    const open = new Heap(); open.push([0, tc, tr]);
    while (open.size) {
      const [d, c, r] = open.pop();
      if (d > dist[this.idx(c, r)]) continue;
      for (const [x, y] of neighbors(c, r, W, this.H)) {
        let cost = this.stepCost(u, c, r);
        if (!isFinite(cost)) cost = (c === tc && r === tr) ? 1 : Infinity;
        if (!isFinite(cost)) continue;
        const nd = d + cost, k = this.idx(x, y);
        if (nd < dist[k]) { dist[k] = nd; open.push([nd, x, y]); }
      }
    }
    return dist;
  }

  moveUnit(u, c, r, reach = this.reachable(u)) {
    const path = this.pathTo(reach, c, r);
    if (!path.length) return false;
    if (u.type === 'schiff' && u.landed) u.landed = false;
    const trav = [[u.c, u.r]];
    let stopped = false;
    for (const [x, y] of path) {
      const occ = this.unitAt(x, y);
      if (occ && occ.owner !== u.owner && !this.flying(u) && !this.flying(occ)) {
        occ.revealUntil = this.tick + 3; stopped = true;
        if (u.owner === 0 || occ.owner === 0) this.say(this.isXeno(occ) ? 'Kontakt! Da ist etwas direkt vor uns!' : `Kontakt: ${this.def(occ).name} im Weg!`, 'bad');
        this.events.push({ type: 'contact', c: x, r: y });
        break;
      }
      u.face = Math.atan2(y - u.r, x - u.c);
      u.c = x; u.r = y; trav.push([x, y]);
      this.syncCargo(u);
      if (!this.flying(u)) {
        const i = this.idx(x, y);
        if (this.acid[i] >= this.round && !this.isXeno(u)) this.hurt(u, 2, null, 'Säure');
        if (this.fire[i] >= this.round) this.hurt(u, 3, null, 'Feuer');
      }
      if (!this.units.includes(u)) break;
      if (u.owner !== 0 && !this.visibleTo(0, u) && this.tracked(0, x, y)) this.events.push({ type: 'ping', c: x, r: y });
      this.reactions(u);
      if (!this.units.includes(u)) break;
    }
    // nicht auf einem eigenen Feld stehen bleiben
    while (this.units.includes(u) && trav.length > 1 && this.units.some((o) => o !== u && o.c === u.c && o.r === u.r && !o.inside && !o.inVent)) {
      trav.pop(); const [px, py] = trav[trav.length - 1]; u.c = px; u.r = py; this.syncCargo(u);
    }
    u.moved = true; u.lastMove = this.tick;
    if (u.mvLeft != null) u.mvLeft = 0;
    this.events.push({ type: 'move', id: u.id, path: trav, stopped });
    if (u.owner === 0) this.computeVis(0);
    return true;
  }
  syncCargo(u) { for (const id of u.cargo) { const x = this.units.find((o) => o.id === id); if (x) { x.c = u.c; x.r = u.r; } } }

  // Reaktionsfeuer: Wachgeschütze und Smartgunner
  reactions(m) {
    if (this.flying(m) || m.inVent) return;
    for (const b of this.buildings) {
      const s = this.bdef(b).sentry;
      if (!s || b.progress || b.owner === m.owner || !b.ammo || b.fired.includes(m.id)) continue;
      if (distance(b.c, b.r, m.c, m.r) > s.rng) continue;
      b.fired.push(m.id); b.ammo--;
      const dmg = this.calcDamage(b, m);
      m.revealUntil = Math.max(m.revealUntil, this.tick + 1);
      this.events.push({ type: 'attack', a: b.id, t: m.id, dmg, react: true });
      this.hurt(m, dmg, b);
      if (!this.units.includes(m)) return;
    }
    for (const w of this.units) {
      if (w.owner === m.owner || w.inside || w.inVent || !w.watchReady || !(this.def(w).abil || []).includes('watch') || !w.ammo) continue;
      const d = distance(w.c, w.r, m.c, m.r), R = this.def(w).rng;
      if (d < R[0] || d > R[1]) continue;
      w.watchReady = false; w.ammo--;
      const dmg = Math.max(1, Math.round(this.calcDamage(w, m) * 0.6));
      m.revealUntil = Math.max(m.revealUntil, this.tick + 1);
      w.face = Math.atan2(m.r - w.r, m.c - w.c);
      this.events.push({ type: 'attack', a: w.id, t: m.id, dmg, react: true });
      this.hurt(m, dmg, w);
      if (!this.units.includes(m)) return;
    }
  }

  // ---------- Kampf ----------
  coverAt(t) {
    if (t.isBld) return 0;
    if (this.flying(t)) return 0;
    const i = this.idx(t.c, t.r);
    let cv = TERRAIN[this.terr(t.c, t.r)].cover;
    if (this.isXeno(t) && this.resin[i]) cv += 0.15;
    if (this.def(t).cls === 'veh' || this.def(t).cls === 'air') cv /= 2;
    return cv;
  }
  baseAtk(a) { return a.isBld ? this.bdef(a).sentry.atk : this.def(a).atk; }
  calcDamage(a, t, exp = false) {
    const ad = a.isBld ? null : this.def(a);
    let base = this.baseAtk(a);
    const tcls = t.isBld ? 'bld' : this.flying(t) ? 'air' : this.def(t).cls;
    let mult = ad && ad.vs ? (ad.vs[tcls] ?? 1) : 1;
    if (tcls === 'air' && ad && !ad.aa) mult *= 0.5;
    if (tcls === 'bld' && ad && ad.cls === 'xeno') mult *= 0.8;
    const hpF = a.isBld ? 1 : 0.55 + 0.45 * a.hp / ad.hp;
    const armor = t.isBld ? this.bdef(t).armor || 0 : this.def(t).armor || 0;
    const dmg = base * mult * hpF * (1 - this.coverAt(t)) * (1 - armor);
    return Math.max(1, Math.round(dmg * (exp ? 1 : 0.88 + Math.random() * 0.24)));
  }
  canHit(a, t) {
    const ad = this.def(a);
    if (a.type === 'klammerer') return !t.isBld && this.def(t).cls === 'inf' && !this.def(t).synth && !t.host && !t.inside && !this.isXeno(t);
    if (ad.atk <= 0) return false;
    if (ad.ammo && !a.ammo) return false;
    if (t.isBld) return a.type !== 'brutling';
    if (t.inside || t.inVent) return false;
    if (this.flying(t)) { if (ad.cls === 'xeno') return false; if (ad.rng[1] < 2 && !ad.aa) return false; }
    return true;
  }
  targetsFrom(a, c = a.c, r = a.r, onlyVisible = true) {
    const R = this.def(a).rng, out = [];
    if (a.inside || a.inVent) return out;
    for (const t of this.units) {
      if (t.owner === a.owner || !this.onMap(t)) continue;
      const d = distance(c, r, t.c, t.r);
      if (d < R[0] || d > R[1]) continue;
      if (!this.canHit(a, t)) continue;
      if (onlyVisible && !this.visibleTo(a.owner, t)) continue;
      out.push(t);
    }
    for (const b of this.buildings) {
      if (b.owner === a.owner) continue;
      const d = distance(c, r, b.c, b.r);
      if (d < R[0] || d > R[1] || !this.canHit(a, b)) continue;
      if (onlyVisible && !this.bVisibleTo(a.owner, b)) continue;
      out.push(b);
    }
    return out;
  }
  canCounter(t, a) {
    if (t.isBld || t.inside || t.inVent) return false;
    const d = this.def(t);
    if (d.cls === 'egg' || t.type === 'klammerer' || d.atk <= 0) return false;
    if (d.ammo && !t.ammo) return false;
    if (a.isBld) return false;
    const dist = distance(t.c, t.r, a.c, a.r);
    if (dist < d.rng[0] || dist > d.rng[1]) return false;
    return this.canHit(t, a);
  }
  forecast(a, t) {
    const dmg = a.type === 'klammerer' ? 0 : this.calcDamage(a, t, true);
    const left = Math.max(0, t.hp - dmg);
    let ctr = 0;
    if (left > 0 && !t.isBld && this.canCounter(t, a)) {
      const ghost = { ...t, hp: left };
      ctr = Math.round(this.calcDamage(ghost, a, true) * 0.75);
    }
    return { dmg, kill: left <= 0, ctr, chance: a.type === 'klammerer' ? this.leapChance(t) : null };
  }
  leapChance(t) { return Math.max(0.3, 0.75 - (this.def(t).armor || 0) * 1.5); }

  attack(a, t) {
    a.acted = true; a.moved = true; a.watchReady = false;
    const ad = this.def(a);
    if (ad.ammo) a.ammo--;
    a.face = Math.atan2(t.r - a.r, t.c - a.c);
    a.revealUntil = this.tick + 3; a.lastMove = Math.max(a.lastMove, this.tick);
    if (a.type === 'klammerer') return this.leap(a, t);
    const dmg = this.calcDamage(a, t);
    this.events.push({ type: 'attack', a: a.id, t: t.id, dmg });
    if ((ad.abil || []).includes('burn')) this.ignite(t.c, t.r, a.owner);
    if (a.type === 'spucker' && !t.isBld) { this.acid[this.idx(t.c, t.r)] = Math.max(this.acid[this.idx(t.c, t.r)], this.round + 1); }
    this.hurt(t, dmg, a);
    if (this.alive(t) && !t.isBld && this.canCounter(t, a)) {
      const cd = Math.max(1, Math.round(this.calcDamage(t, a) * 0.75));
      t.revealUntil = this.tick + 3;
      this.events.push({ type: 'attack', a: t.id, t: a.id, dmg: cd, counter: true });
      this.hurt(a, cd, t);
    }
    if (a.owner === 0 || t.owner === 0) this.computeVis(0);
    return true;
  }
  alive(e) { return e.isBld ? this.buildings.includes(e) : this.units.includes(e); }
  leap(k, t) {
    const ch = this.leapChance(t);
    if (!t.host && Math.random() < ch) {
      t.host = { t: HOST_TIME, stab: false };
      t.hp = Math.max(1, t.hp - 1);
      this.units = this.units.filter((u) => u !== k);
      this.events.push({ type: 'leap', a: k.id, t: t.id, from: [k.c, k.r], ok: true });
      if (t.owner === 0) this.say(`${this.def(t).name} wurde befallen — ${HOST_TIME} Runden bis zum Ausbruch!`, 'bad');
      else if (this.vis[0] && this.vis[0].seen[this.idx(t.c, t.r)]) this.say(`Ein ${this.def(t).name}-Trupp der ${FACTIONS[this.fac(t.owner)].short} wurde befallen.`, 'warn');
    } else {
      this.events.push({ type: 'leap', a: k.id, t: t.id, ok: false });
      if (this.canCounter(t, k)) { const cd = this.calcDamage(t, k); this.events.push({ type: 'attack', a: t.id, t: k.id, dmg: cd, counter: true }); this.hurt(k, cd, t); }
    }
    return true;
  }
  ignite(c, r, owner = -1) {
    const i = this.idx(c, r);
    this.fire[i] = this.round + 1;
    if (this.resin[i]) { this.resin[i] = 0; this.befall = Math.max(0, this.befall - 0.4); if (owner >= 0 && owner < 2) this.players[owner].stats.resin++; }
  }

  hurt(t, dmg, by, why) {
    if (!this.alive(t)) return;
    t.hp -= dmg;
    if (why) this.events.push({ type: 'float', c: t.c, r: t.r, text: `−${dmg} ${why}`, color: why === 'Säure' ? '#9dff6a' : '#ffae5a' });
    if (t.hp <= 0) this.destroy(t, by);
  }

  destroy(t, by) {
    const byHuman = by && !by.isBld ? !this.isXeno(by) : !!by;
    const byOwner = by ? by.owner : -1;
    if (t.isBld) {
      this.buildings = this.buildings.filter((b) => b !== t);
      this.events.push({ type: 'die', bid: t.id, c: t.c, r: t.r, bld: true, kind: t.type });
      const name = this.bdef(t).name;
      if (byOwner >= 0 && byOwner < 2 && byOwner !== t.owner) this.players[byOwner].stats.bld++;
      if (by && !by.isBld && this.isXeno(by) && t.type === 'wohnmodul') {
        this.biomass += 6; this.befall += 3;
        this.say('Ein Wohnmodul ist gefallen. Die Bewohner wurden eingesponnen.', 'bad');
      } else if (t.owner === 0 || byOwner === 0) this.say(`${name} zerstört.`, t.owner === 0 ? 'bad' : 'good');
      if (t.type === 'zentrale') { this.players[t.owner].out = true; this.say(`Die Kolonie-Zentrale ist gefallen — ${this.players[t.owner].name} sind ausgeschieden.`, 'bad'); }
      if (t.type === 'fob') this.checkMarines(t.owner);
      if (t.owner === 0) this.computeVis(0);
      this.checkObjectives();
      return;
    }
    const d = this.def(t);
    for (const id of t.cargo) { const x = this.units.find((o) => o.id === id); if (x) { this.units = this.units.filter((o) => o !== x); } }
    this.units = this.units.filter((u) => u !== t);
    this.events.push({ type: 'die', id: t.id, c: t.c, r: t.r, kind: t.type, xeno: this.isXeno(t), owner: t.owner });
    if (byOwner >= 0 && byOwner < 2) {
      const st = this.players[byOwner].stats;
      if (t.type === 'ei') st.eggs++; else if (this.isXeno(t)) st.xeno++;
      if (t.type === 'mutter') st.mother = 1;
      if (t.type === 'schiff' && t.owner !== byOwner) st.ships++;
    }
    if (this.isXeno(t)) {
      this.befall = Math.max(0, this.befall - (t.type === 'mutter' ? 15 : t.type === 'knoten' ? 4 : t.type === 'ei' ? 1 : 0.6));
      if (t.type === 'knoten') this.say(byOwner === 0 ? 'Nestknoten zerstört — der Befall sinkt.' : 'Ein Nestknoten wurde zerstört.', byOwner === 0 ? 'good' : 'info');
      if (t.type !== 'ei' && t.type !== 'klammerer') this.acidSplash(t, by);
      if (byOwner >= 0 && byOwner !== 2) this.players[byOwner].credits += t.type === 'mutter' ? 400 : BOUNTY.xeno;
      if (t.type === 'mutter') this.say('Die Mutter ist tot! Der Befall bricht ein.', 'good');
    } else {
      if (by && !by.isBld && this.isXeno(by)) { this.befall += 1.5; this.biomass += 3; }
      else if (byOwner >= 0 && byOwner !== 2 && byOwner !== t.owner) this.players[byOwner].credits += BOUNTY.human;
      if (t.owner === 0) this.say(`${d.name} gefallen${t.cargo.length ? ' — mit allen Insassen' : ''}.`, 'bad');
      if (this.fac(t.owner) === 'marines') this.checkMarines(t.owner);
      if (t.owner === 0) this.computeVis(0);
    }
    this.checkObjectives();
  }
  acidSplash(x, by) {
    const i = this.idx(x.c, x.r);
    this.acid[i] = this.round + 2;
    this.events.push({ type: 'acid', c: x.c, r: x.r });
    for (const [c, r] of neighbors(x.c, x.r, this.W, this.H)) {
      const u = this.unitAt(c, r);
      if (u && !this.isXeno(u) && !this.flying(u)) this.hurt(u, this.def(u).cls === 'veh' ? 3 : 2, null, 'Säure');
      const b = this.bAt(c, r);
      if (b) this.hurt(b, 2, null, 'Säure');
    }
  }
  checkMarines(pid) {
    const p = this.players[pid];
    if (p.out || p.faction !== 'marines') return;
    const hasUnits = this.units.some((u) => u.owner === pid);
    const hasFob = this.buildings.some((b) => b.owner === pid && b.type === 'fob');
    if (!hasUnits && !hasFob && p.credits < 220) { p.out = true; this.say('Die Marines haben keine Verbindung mehr zum Orbit — ausgeschieden.', pid === 0 ? 'bad' : 'good'); }
  }

  // ---------- Sonderaktionen ----------
  abil(u, k) { return (this.def(u).abil || []).includes(k); }
  cargoSize(u) { return this.def(u).cls === 'veh' ? 3 : 1; }
  cargoUsed(c) { return c.cargo.reduce((s, id) => { const x = this.units.find((o) => o.id === id); return s + (x ? this.cargoSize(x) : 0); }, 0); }
  canBoard(u, c) {
    if (u.owner !== c.owner || u === c || u.inside || u.acted) return false;
    const ud = this.def(u), cd = this.def(c);
    if (!cd.cap || !(ud.cls === 'inf' || (ud.cls === 'veh' && cd.cls === 'air'))) return false;
    if (cd.cls === 'air' && !c.landed) return false;
    if (distance(u.c, u.r, c.c, c.r) > 1) return false;
    return this.cargoUsed(c) + this.cargoSize(u) <= cd.cap;
  }
  board(u, c) {
    c.cargo.push(u.id); u.inside = c.id; u.c = c.c; u.r = c.r; u.acted = u.moved = true;
    this.events.push({ type: 'board', id: u.id, cid: c.id });
    if (u.owner === 0) this.computeVis(0);
  }
  unloadHexes(c) { return neighbors(c.c, c.r, this.W, this.H).filter(([x, y]) => !this.unitAt(x, y) && !this.bAt(x, y) && TERRAIN[this.terr(x, y)].mv != null); }
  canUnload(c) { return c.cargo.length > 0 && (this.def(c).cls !== 'air' || c.landed) && this.unloadHexes(c).length > 0; }
  unloadAll(c) {
    const out = [];
    for (const id of [...c.cargo]) {
      const x = this.units.find((o) => o.id === id); if (!x) continue;
      const h = this.unloadHexes(c).find(([a, b]) => this.canStand(x.type, a, b));
      if (!h) continue;
      c.cargo = c.cargo.filter((k) => k !== id); x.inside = null; x.c = h[0]; x.r = h[1];
      out.push(x);
      this.events.push({ type: 'unload', id: x.id, from: [c.c, c.r] });
    }
    c.cargo = c.cargo.filter((id) => this.units.some((o) => o.id === id));
    if (c.owner === 0) this.computeVis(0);
    return out;
  }
  canLand(u) { return u.type === 'schiff' && !u.landed && !u.acted && TERRAIN[this.terr(u.c, u.r)].veh != null && !this.bAt(u.c, u.r); }
  land(u) { u.landed = true; u.moved = u.acted = true; this.events.push({ type: 'land', id: u.id }); }

  flareHexes(u) { return u.flares > 0 && !u.acted && !u.inside ? ring(u.c, u.r, LIGHT_FLARE.range, this.W, this.H) : []; }
  flare(u, c, r) {
    u.flares--; u.acted = true; u.moved = true;
    this.flares.push({ c, r, rad: LIGHT_FLARE.rad, owner: u.owner, until: this.round + LIGHT_FLARE.rounds - 1 });
    this.events.push({ type: 'flare', from: [u.c, u.r], c, r, owner: u.owner });
    this.computeVis(u.owner); if (u.owner !== 0) this.computeVis(0);
  }

  weldTargets(u) {
    if (!this.abil(u, 'weld') || u.acted || u.inside) return [];
    return this.vents.filter((v) => !v.sealed && distance(v.c, v.r, u.c, u.r) <= 1 && this.knowsVent(u.owner, v) && !this.units.some((x) => x.inVent && x.ventId === v.id && x.owner === u.owner));
  }
  weld(u, v) { v.sealed = true; v.sealedBy = u.owner; u.acted = u.moved = true; this.events.push({ type: 'weld', c: v.c, r: v.r, id: u.id }); if (u.owner === 0) this.say('Schacht verschweißt.', 'good'); this.checkObjectives(); }
  breakTargets(u) { return u.type === 'jaeger' || u.type === 'brecher' ? this.vents.filter((v) => v.sealed && !v.collapsed && distance(v.c, v.r, u.c, u.r) <= 1) : []; }
  breakVent(u, v) {
    v.sealed = false; u.acted = u.moved = true; u.lastMove = this.tick;
    this.events.push({ type: 'breakvent', c: v.c, r: v.r });
    if (this.near(0, v.c, v.r, 6)) this.say('Metall kreischt — ein verschweißter Schacht wurde aufgebrochen.', 'warn');
  }
  // Schachtnetz: Erreichbarkeit über Verbindungen, verschweißte Knoten sperren
  ventReach(fromId, hops, pid = 2) {
    const start = this.vents[fromId];
    const out = new Map();
    if (!start || start.sealed) return out;
    out.set(fromId, 0);
    let front = [fromId];
    for (let h = 1; h <= hops; h++) {
      const nx = [];
      for (const id of front) for (const l of this.vents[id].links) {
        const v = this.vents[l];
        if (out.has(l) || v.sealed) continue;
        if (pid !== 2 && !this.knowsVent(pid, v)) continue;
        out.set(l, h); nx.push(l);
      }
      front = nx;
    }
    return out;
  }
  ventTravel(u, toId, stay) {
    const from = u.inVent ? this.vents[u.ventId] : this.ventAt(u.c, u.r);
    const to = this.vents[toId];
    const fc = from.c, fr = from.r;
    if (this.tracked(0, fc, fr) && u.owner !== 0 && !this.visibleTo(0, u)) this.events.push({ type: 'ping', c: fc, r: fr, vent: true });
    u.ventTick = this.tick; u.lastMove = this.tick;
    if (!stay && (this.unitAt(to.c, to.r) || this.bAt(to.c, to.r))) stay = true;
    u.c = to.c; u.r = to.r;
    if (stay) { u.inVent = true; u.ventId = toId; u.moved = true; u.acted = true; }
    else {
      const wasIn = u.inVent;
      u.inVent = false; u.ventId = null;
      if (wasIn) u.mvLeft = 2; else { u.moved = true; u.mvLeft = 0; }
      this.events.push({ type: 'emerge', id: u.id, c: to.c, r: to.r });
    }
    if (this.tracked(0, to.c, to.r) && u.owner !== 0 && !this.visibleTo(0, u)) this.events.push({ type: 'ping', c: to.c, r: to.r, vent: true });
    if (!stay) this.reactions(u);
  }
  crawlTargets(u) {
    if (this.def(u).cls !== 'inf' || u.acted || u.inside || this.isXeno(u)) return [];
    const v = this.ventAt(u.c, u.r); if (!v || v.sealed) return [];
    const hops = this.fac(u.owner) === 'siedler' ? 2 : 1;
    const R = this.ventReach(v.id, hops, u.owner);
    return [...R.keys()].filter((id) => id !== v.id).map((id) => this.vents[id]).filter((t) => !this.unitAt(t.c, t.r) && !this.bAt(t.c, t.r));
  }
  crawl(u, v) {
    const from = [u.c, u.r];
    u.c = v.c; u.r = v.r; u.moved = u.acted = true; u.lastMove = this.tick; u.ventTick = this.tick;
    this.events.push({ type: 'crawl', id: u.id, from, c: v.c, r: v.r });
    if (u.owner === 0) { this.computeVis(0); this.say('Durch den Schacht gekrochen.', 'info'); }
    this.reactions(u);
  }

  healTargets(u) {
    if (!this.abil(u, 'heal') || u.acted || u.inside) return [];
    return this.units.filter((t) => t.owner === u.owner && t !== u && this.onMap(t) && distance(t.c, t.r, u.c, u.r) <= 1 && (t.hp < this.def(t).hp && this.def(t).cls === 'inf' || (t.host && !t.host.stab)));
  }
  heal(u, t) {
    u.acted = u.moved = true;
    if (t.host && !t.host.stab) { t.host.t++; t.host.stab = true; this.events.push({ type: 'float', c: t.c, r: t.r, text: 'Stabilisiert +1', color: '#8ef0c0' }); }
    else { const h = Math.min(this.def(t).hp - t.hp, 4); t.hp += h; this.events.push({ type: 'float', c: t.c, r: t.r, text: `+${h}`, color: '#8ef08a' }); }
  }
  repairTargets(u) {
    if (!this.abil(u, 'repair') || u.acted || u.inside) return [];
    const bs = this.buildings.filter((b) => b.owner === u.owner && distance(b.c, b.r, u.c, u.r) <= 1 && !b.progress && (b.hp < this.bdef(b).hp || (this.bdef(b).sentry && b.ammo < this.bdef(b).sentry.ammo)));
    const vs = this.units.filter((t) => t.owner === u.owner && this.onMap(t) && distance(t.c, t.r, u.c, u.r) <= 1 && ['veh', 'air'].includes(this.def(t).cls) && t.hp < this.def(t).hp && (this.def(t).cls !== 'air' || t.landed));
    return [...bs, ...vs];
  }
  repair(u, t) {
    u.acted = u.moved = true;
    if (t.isBld) { const s = this.bdef(t).sentry; if (s) t.ammo = s.ammo; t.hp = Math.min(this.bdef(t).hp, t.hp + 6); }
    else t.hp = Math.min(this.def(t).hp, t.hp + 5);
    this.events.push({ type: 'float', c: t.c, r: t.r, text: 'Instand gesetzt', color: '#9fd8ff' });
  }
  burnTargets(u) {
    if (!this.abil(u, 'burn') || u.acted || u.inside) return [];
    return ring(u.c, u.r, 1, this.W, this.H).filter(([c, r]) => this.resin[this.idx(c, r)]);
  }
  burn(u, c, r) { u.acted = u.moved = true; u.face = Math.atan2(r - u.r, c - u.c); this.ignite(c, r, u.owner); this.events.push({ type: 'burn', id: u.id, c, r }); }


  // ---------- Geheime Ziele ----------
  objPool(pid, aiOnly) {
    const f = this.fac(pid);
    return Object.keys(OBJECTIVES).filter((k) => (OBJECTIVES[k].fac === f || OBJECTIVES[k].fac === 'both') && (!aiOnly || OBJECTIVES[k].ai));
  }
  assignObjectives() {
    const shuffle = (a) => a.sort(() => Math.random() - 0.5);
    for (const p of this.players) {
      if (p.faction === 'brut') continue;
      const pool = shuffle(this.objPool(p.id, p.ai));
      if (p.id === 0) { this.objOffer = pool.filter((k) => k !== 'mutter').slice(0, 2); p.obj = { key: this.objOffer[0], done: false }; }
      else p.obj = { key: pool.find((k) => k !== 'mutter') || pool[0], done: false };
    }
  }
  chooseObjective(k) { if (this.objOffer.includes(k)) this.players[0].obj = { key: k, done: false }; this.objOffer = []; }
  objProgress(pid) {
    const p = this.players[pid], o = p.obj; if (!o) return null;
    const st = p.stats, sealed = this.vents.filter((v) => v.sealed && v.sealedBy === pid).length;
    const map = {
      wirt: [st.wirt ? 1 : 0, 1], zerschlagen: [st.bld, 4], minen: [this.sites.filter((x) => x.type === 'mine' && x.owner === pid).length, 2],
      funk: [st.funk, 3], labor: [st.labor, 3], versiegeln: [sealed, 5], abschuss: [st.ships, 1],
      ausbrennen: [Math.max(Math.floor(st.resin / 10 * 6), st.eggs), 6], jagd: [st.xeno, 12], mutter: [st.mother, 1],
    };
    const [have, need] = map[o.key] || [0, 1];
    const text = o.key === 'ausbrennen' ? `${st.resin}/10 Harz · ${st.eggs}/6 Eier` : `${Math.min(have, need)}/${need}`;
    return { have, need, text, done: o.done };
  }
  checkObjectives(roundEnd = false) {
    for (const p of this.players) {
      if (!p.obj || p.obj.done || p.out || p.faction === 'brut') continue;
      if (p.obj.key === 'minen' && !roundEnd) continue;
      const pr = this.objProgress(p.id);
      if (pr.have >= pr.need) {
        p.obj.done = true; p.score += OBJECTIVES[p.obj.key].pts; p.credits += 300;
        const name = OBJECTIVES[p.obj.key].name;
        if (p.id === 0) { this.events.push({ type: 'banner', text: 'Geheimziel erfüllt', sub: `${name} · +${OBJECTIVES[p.obj.key].pts} Punkte` }); this.say(`Geheimziel erfüllt: ${name} (+${OBJECTIVES[p.obj.key].pts} Punkte, +300).`, 'good'); }
        else this.say(`${p.name} haben ihr Geheimziel erfüllt: ${name} (+${OBJECTIVES[p.obj.key].pts} Punkte).`, 'bad');
      }
    }
  }

  // ---------- Synthetiker ----------
  scanTargets(u) {
    if (u.acted || u.inside || !(this.abil(u, 'heal') || this.abil(u, 'repair')) || u.type === 'synth') return [];
    return this.units.filter((s) => s.owner === u.owner && s.type === 'synth' && !s.scanned && this.onMap(s) && distance(s.c, s.r, u.c, u.r) <= 1);
  }
  scan(u, s) {
    u.acted = u.moved = true;
    this.events.push({ type: 'scan', c: s.c, r: s.r });
    if (s.sleeper) { this.defect(s, true); return; }
    s.scanned = true;
    if (u.owner === 0) this.say('Scan abgeschlossen: Der Synthetiker ist loyal.', 'good');
    this.events.push({ type: 'float', c: s.c, r: s.r, text: 'loyal ✓', color: '#8ef0c0' });
  }
  defect(s, found) {
    const former = s.owner;
    if (s.inside) {
      const car = this.units.find((x) => x.id === s.inside);
      if (car) { car.cargo = car.cargo.filter((id) => id !== s.id); const h = this.freeHexNear(car.c, car.r, 'synth', 2); if (h) { s.c = h[0]; s.r = h[1]; } }
      s.inside = null;
    }
    s.owner = 2; s.defected = true; s.sleeper = false; s.scanned = true; s.revealUntil = this.tick + 4; s.lastMove = this.tick;
    s.moved = s.acted = true;
    // Sabotage im Umkreis von 3
    let n = 0;
    for (const v of this.vents) if (v.sealed && !v.collapsed && distance(v.c, v.r, s.c, s.r) <= 3) { v.sealed = false; n++; }
    for (const b of this.buildings) {
      if (b.owner !== former || distance(b.c, b.r, s.c, s.r) > 3) continue;
      if (this.bdef(b).sentry) b.ammo = 0;
      if (b.type === 'flutlicht') b.hp = Math.min(b.hp, 2);
    }
    this.events.push({ type: 'defect', id: s.id, c: s.c, r: s.r, former });
    const fp = this.players[former];
    if (former === 0) this.say(found ? 'Der Scan löst einen versteckten Konzernbefehl aus — der Synthetiker wendet sich gegen euch!' : 'Euer Synthetiker folgt einem versteckten Konzernbefehl: Er öffnet Schächte, legt Geschütze lahm und greift an!', 'bad');
    else if (this.vis[0] && this.vis[0].seen[this.idx(s.c, s.r)]) this.say(`Der Synthetiker der ${FACTIONS[fp.faction].short} ist übergelaufen — zur Brut.`, 'warn');
    if (n && former === 0) this.say(`${n} verschweißte ${n === 1 ? 'Schacht' : 'Schächte'} wieder offen.`, 'warn');
    if (this.fac(former) === 'marines') this.checkMarines(former);
    this.computeVis(0);
  }

  // ---------- Atmosphäreprozessor ----------
  coreSite() { return this.sites.find((x) => x.type === 'prozessor'); }
  canCool(u) {
    if (this.core == null || u.acted || u.inside || !this.abil(u, 'repair')) return false;
    const s = this.coreSite(); return distance(s.c, s.r, u.c, u.r) <= 1 && this.core < CORE.max;
  }
  cool(u) {
    this.core = Math.min(CORE.max, this.core + CORE.cool);
    u.acted = u.moved = true;
    const s = this.coreSite();
    this.events.push({ type: 'cool', c: s.c, r: s.r });
    if (u.owner === 0) this.say(`Kühlung hochgefahren: Der Prozessor hält noch ${this.core} Runden.`, 'good');
  }

  // ---------- Spezialwaffen ----------
  orbitalHexes(u) {
    if (!this.abil(u, 'orbital') || u.acted || u.inside) return [];
    const p = this.players[u.owner];
    if (p.credits < ORBITAL.cost || this.round < p.orbitalAt) return [];
    const v = this.vis[u.owner];
    return ring(u.c, u.r, ORBITAL.range, this.W, this.H).filter(([c, r]) => !v || v.seen[this.idx(c, r)]);
  }
  orbital(u, c, r) {
    const p = this.players[u.owner];
    p.credits -= ORBITAL.cost; p.orbitalAt = this.round + ORBITAL.cooldown;
    u.acted = u.moved = true;
    this.events.push({ type: 'orbital', c, r, owner: u.owner });
    if (u.owner !== 0 && this.near(0, c, r, 8)) this.say('Orbitalschlag der Marines!', 'warn');
    this.blast(c, r, ORBITAL.rad, ORBITAL.dmg, ORBITAL.bld, u);
  }
  chargeHexes(u) {
    if (!this.abil(u, 'charge') || u.acted || u.inside || this.players[u.owner].credits < CHARGE.cost) return [];
    return neighbors(u.c, u.r, this.W, this.H).filter(([c, r]) => !this.bAt(c, r) && !this.charges.some((k) => k.c === c && k.r === r) && this.terr(c, r) !== 'chasm');
  }
  charge(u, c, r) {
    this.players[u.owner].credits -= CHARGE.cost;
    u.acted = u.moved = true;
    this.charges.push({ c, r, owner: u.owner, type: u.type });
    this.events.push({ type: 'plant', c, r, owner: u.owner });
    if (u.owner === 0) this.say('Sprengladung gelegt — sie zündet am Rundenende.', 'info');
  }
  blast(c, r, rad, dmg, bdmg, by) {
    for (const [x, y] of ring(c, r, rad, this.W, this.H)) {
      this.ignite(x, y, by ? by.owner : -1);
      const u = this.unitAt(x, y, true);
      if (u && !(u.inVent && distance(c, r, x, y) > 0)) { if (u.inVent) { u.inVent = false; u.ventId = null; } this.hurt(u, distance(c, r, x, y) ? Math.round(dmg * 0.7) : dmg, by); }
      const b = this.bAt(x, y);
      if (b) this.hurt(b, bdmg, by);
    }
    const v = this.ventAt(c, r);
    if (v) { v.sealed = true; v.collapsed = true; v.sealedBy = by ? by.owner : -1; }
    if (by && by.owner === 0 || this.near(0, c, r, 2)) this.computeVis(0);
  }

  // ---------- Bauen und Nachschub ----------
  buildHexes(u, type) {
    if (!this.abil(u, 'build') || u.acted || u.inside) return [];
    const d = BUILDINGS[type], f = this.fac(u.owner);
    if (!d || (d.fac !== 'both' && d.fac !== f) || type === 'fob' || type === 'zentrale') return [];
    if (this.players[u.owner].credits < d.cost) return [];
    return neighbors(u.c, u.r, this.W, this.H).filter(([c, r]) => {
      if (this.unitAt(c, r) || this.bAt(c, r) || this.siteAt(c, r) || this.ventAt(c, r)) return false;
      if (TERRAIN[this.terr(c, r)].veh == null) return false;
      if (f === 'siedler') return this.buildings.some((b) => b.owner === u.owner && !b.progress && distance(b.c, b.r, c, r) <= 3) || this.sites.some((s) => s.owner === u.owner && distance(s.c, s.r, c, r) <= 2);
      return type === 'depot' || this.buildings.some((b) => b.owner === u.owner && b.type === 'fob' && distance(b.c, b.r, c, r) <= 2);
    });
  }
  build(u, type, c, r) {
    const d = BUILDINGS[type];
    this.players[u.owner].credits -= d.cost;
    const b = this.addBuilding(u.owner, type, c, r, d.build || 0);
    u.acted = u.moved = true;
    this.events.push({ type: 'build', bid: b.id, c, r });
    if (u.owner === 0) this.computeVis(0);
    return b;
  }
  fobHexes(u) {
    if (!this.abil(u, 'fob') || u.acted || u.inside) return [];
    const mine = this.buildings.filter((b) => b.owner === u.owner && b.type === 'fob');
    if (mine.length >= 3 || this.players[u.owner].credits < BUILDINGS.fob.cost) return [];
    return neighbors(u.c, u.r, this.W, this.H).filter(([c, r]) => !this.unitAt(c, r) && !this.bAt(c, r) && !this.siteAt(c, r) && !this.ventAt(c, r) && TERRAIN[this.terr(c, r)].veh != null &&
      mine.every((b) => distance(b.c, b.r, c, r) >= 5) && !this.buildings.some((b) => b.owner !== u.owner && distance(b.c, b.r, c, r) < 3));
  }
  spawnPoints(pid) {
    const f = this.fac(pid);
    if (f === 'siedler') return this.buildings.filter((b) => b.owner === pid && !b.progress && this.bdef(b).recruit);
    return [...(this.lzBlocked(pid) ? [] : [this.lzPoint]), ...this.buildings.filter((b) => b.owner === pid && b.type === 'fob' && !b.progress)];
  }
  buyList(pid, sp) {
    if (this.fac(pid) === 'siedler') return sp && sp.isBld ? this.bdef(sp).recruit || [] : [];
    return MARINE_BUY;
  }
  lzBlocked(pid) { const L = this.map.lz; return this.units.some((u) => u.owner !== pid && this.onMap(u) && !this.flying(u) && this.def(u).cls !== 'egg' && distance(u.c, u.r, L.c, L.r) <= 2); }
  spawnLimit(sp) { return SPAWN_LIMIT[sp.type] || 2; }
  canBuy(pid, type, sp) {
    const d = UNITS[type], p = this.players[pid];
    if (!d || (d.fac !== p.faction && d.fac !== 'both') || p.credits < d.cost) return false;
    if (type === 'synth' && this.units.some((u) => u.owner === pid && u.type === 'synth')) return false;
    if (!this.buyList(pid, sp).includes(type)) return false;
    if (type === 'schiff') return this.units.filter((u) => u.owner === pid && u.type === 'schiff').length < 2 && !!this.lzHex(type) && !this.lzBlocked(pid);
    if ((sp.spawned || 0) >= this.spawnLimit(sp)) return false;
    return !!this.spawnHex(type, sp);
  }
  spawnHex(type, sp) {
    const opts = neighbors(sp.c, sp.r, this.W, this.H).filter(([c, r]) => this.canStand(type, c, r));
    if (opts.length) return opts[Math.floor(Math.random() * opts.length)];
    if (sp.isBld || sp.isLz) return this.freeHexNear(sp.c, sp.r, type, 2);
    return null;
  }
  lzHex(type) { return this.freeHexNear(this.map.lz.c, this.map.lz.r, type, 3); }
  buy(pid, type, sp) {
    if (!this.canBuy(pid, type, sp)) return null;
    const d = UNITS[type];
    const h = type === 'schiff' ? this.lzHex(type) : this.spawnHex(type, sp);
    this.players[pid].credits -= d.cost;
    const u = this.addUnit(pid, type, h[0], h[1]);
    u.moved = u.acted = true; u.lastMove = this.tick;
    if (type === 'synth') { u.sleeper = Math.random() < SLEEPER_CHANCE; u.scanned = false; }
    if (type !== 'schiff') sp.spawned = (sp.spawned || 0) + 1;
    if (this.fac(pid) === 'marines') this.events.push({ type: type === 'schiff' ? 'shipin' : 'dropin', ids: [u.id], c: u.c, r: u.r, owner: pid });
    else this.events.push({ type: 'spawn', id: u.id, from: [sp.c, sp.r] });
    if (pid === 0) this.computeVis(0);
    return u;
  }

  // ---------- Rundenende ----------
  endRound() {
    const R = this.round;
    const humans = this.players.filter((p) => p.faction !== 'brut');
    // Sprengladungen zünden
    for (const k of this.charges) {
      this.events.push({ type: 'charge', c: k.c, r: k.r, owner: k.owner });
      this.blast(k.c, k.r, CHARGE.rad, CHARGE.dmg, CHARGE.bld, { type: k.type, owner: k.owner, c: k.c, r: k.r });
    }
    this.charges = [];
    // Schlüsselorte
    for (const s of this.sites) {
      const occ = this.unitAt(s.c, s.r);
      s.blocked = !!(occ && (this.isXeno(occ) || occ.owner === 2));
      if (occ && !this.isXeno(occ) && occ.owner !== 2 && !this.players[occ.owner].out) {
        const foe = this.units.some((u) => this.onMap(u) && !this.isXeno(u) && u.owner !== occ.owner && distance(u.c, u.r, s.c, s.r) <= 1);
        if (!foe && s.owner !== occ.owner) {
          const old = s.owner; s.owner = occ.owner;
          this.events.push({ type: 'capture', sid: s.id, owner: occ.owner });
          if (occ.owner === 0) this.say(`${SITES[s.type].name} eingenommen.`, 'good');
          else if (old === 0) this.say(`${SITES[s.type].name} an die ${FACTIONS[this.fac(occ.owner)].short} verloren!`, 'bad');
        }
      }
      s.manned = s.owner >= 0 && (this.units.some((u) => u.owner === s.owner && this.onMap(u) && !this.flying(u) && distance(u.c, u.r, s.c, s.r) <= 1) ||
        this.buildings.some((b) => b.owner === s.owner && !b.progress && distance(b.c, b.r, s.c, s.r) <= 2 && (this.bdef(b).sentry || b.type === 'fob')));
      if (s.owner >= 0 && !s.blocked && s.manned && !this.players[s.owner].out) {
        this.players[s.owner].score += SITES[s.type].pts;
        this.players[s.owner].credits += SITES[s.type].income * (this.players[s.owner].ai ? this.diff.aiCash : 1);
      }
    }
    for (const p of humans) {
      const st = p.stats;
      const held = (type) => this.sites.some((x) => x.type === type && x.owner === p.id && x.manned && !x.blocked);
      st.labor = held('labor') ? st.labor + 1 : 0;
      st.funk = held('funkmast') ? st.funk + 1 : 0;
      // Sonderorder: Wirt im gelandeten Schiff auf dem Landefeld
      if (p.faction === 'marines' && p.obj && p.obj.key === 'wirt' && !p.obj.done) {
        const h = this.units.find((u) => u.owner === p.id && u.host && this.onMap(u) && this.terr(u.c, u.r) === 'pad');
        if (h) { st.wirt = 1; this.units = this.units.filter((x) => x !== h); this.events.push({ type: 'dropout', c: h.c, r: h.r, owner: p.id }); if (p.id === 0) this.say('Der Wirt wurde vom Landefeld ausgeflogen — der Konzern hat sein Exemplar.', 'good'); }
      }
    }
    // Einkommen
    for (const p of humans) {
      if (p.out) continue;
      let inc = 0;
      if (p.faction === 'siedler') for (const b of this.buildings) if (b.owner === p.id && !b.progress && this.bdef(b).income) inc += this.bdef(b).income;
      if (p.faction === 'marines') inc += 140;
      p.credits += Math.round(inc * (p.ai ? this.diff.aiCash : 1));
    }
    // Befall: Heilung oder Ausbruch
    for (const u of [...this.units]) {
      if (!u.host || !this.units.includes(u)) continue;
      const carrier = u.inside ? this.units.find((x) => x.id === u.inside) : null;
      const cured = (carrier && carrier.type === 'schiff' && carrier.landed) ||
        this.buildings.some((b) => b.owner === u.owner && this.bdef(b).cure && !b.progress && distance(b.c, b.r, u.c, u.r) <= 1);
      if (cured) {
        u.host = null;
        this.events.push({ type: 'float', c: u.c, r: u.r, text: 'Befall entfernt', color: '#8ef0c0' });
        if (u.owner === 0) this.say(`${this.def(u).name}: Der Parasit wurde entfernt.`, 'good');
        continue;
      }
      u.host.t--;
      if (u.host.t <= 0) this.burst(u, carrier);
    }
    // Brutlinge wachsen, Eier öffnen sich
    for (const u of this.units) {
      if (u.type === 'brutling' && --u.grow <= 0) { u.type = this.stage >= 2 ? 'jaeger' : 'laeufer'; u.hp = this.def(u).hp; u.grow = null; }
    }
    for (const e of this.units.filter((u) => u.type === 'ei')) {
      const prey = this.units.some((u) => this.onMap(u) && this.def(u).cls === 'inf' && !this.isXeno(u) && distance(u.c, u.r, e.c, e.r) <= 2);
      if (prey || Math.random() < 0.03) {
        e.type = 'klammerer'; e.hp = UNITS.klammerer.hp; e.lastMove = this.tick;
        this.events.push({ type: 'hatch', id: e.id, c: e.c, r: e.r });
        if (this.near(0, e.c, e.r, 4)) this.say('Ein Ei öffnet sich …', 'warn');
      }
    }
    // Heilung an Bauten und auf dem Landefeld
    for (const u of this.units) {
      if (!this.onMap(u) || this.isXeno(u)) continue;
      const d = this.def(u); let h = 0;
      if (this.buildings.some((b) => b.owner === u.owner && this.bdef(b).cure && !b.progress && distance(b.c, b.r, u.c, u.r) <= 1)) h = 3;
      else if (this.buildings.some((b) => b.owner === u.owner && b.type === 'zentrale' && distance(b.c, b.r, u.c, u.r) <= 1)) h = 2;
      else if (this.terr(u.c, u.r) === 'pad' && this.fac(u.owner) === 'marines') h = u.type === 'schiff' ? 5 : 2;
      if (h && u.hp < d.hp) u.hp = Math.min(d.hp, u.hp + h);
    }
    // Brut-Regeneration auf Harz
    for (const u of this.units) if (this.isXeno(u) && this.onMap(u) && this.resin[this.idx(u.c, u.r)]) u.hp = Math.min(this.def(u).hp, u.hp + 2);
    // Überlagerungen, Bauten
    this.flares = this.flares.filter((f) => f.until > R);
    for (const b of this.buildings) if (b.progress > 0) { b.progress--; if (!b.progress && b.owner === 0) this.say(`${this.bdef(b).name} fertig.`, 'good'); }
    // Harz breitet sich aus
    this.spreadResin();
    const resinCount = this.resin.reduce((s, v) => s + v, 0);
    this.biomass += (4 + Math.min(14, resinCount * 0.12) + this.units.filter((u) => u.type === 'knoten').length) * this.diff.brood;
    this.befall += 1.2;
    this.befall = Math.min(100, this.befall);
    // Schläfer-Synthetiker
    for (const u of [...this.units]) {
      if (u.type !== 'synth' || !u.sleeper || u.owner === 2) continue;
      const p = this.players[u.owner];
      const ch = 0.05 * this.stage + (p.score >= this.target * 0.7 ? 0.25 : 0);
      if (Math.random() < ch) this.defect(u, false);
    }
    // Atmosphäreprozessor
    if (this.core == null && this.befall >= CORE.trigger) {
      this.core = CORE.start;
      this.events.push({ type: 'banner', text: 'Prozessor überhitzt', sub: `${this.core} Runden bis zur Kernschmelze` });
      this.say(`Der Atmosphäreprozessor überhitzt! Techniker, Pioniere oder Synthetiker daneben können ihn kühlen. Sinkt der Befall unter ${CORE.safe} %, beruhigt er sich.`, 'bad');
    } else if (this.core != null) {
      if (this.befall < CORE.safe) { this.core = null; this.say('Der Atmosphäreprozessor hat sich stabilisiert.', 'good'); }
      else {
        this.core--;
        if (this.core <= 3 && this.core > 0) this.say(`Kernschmelze in ${this.core} ${this.core === 1 ? 'Runde' : 'Runden'}!`, 'bad');
        if (this.core <= 0) { this.coreBlown = true; this.say('Kernschmelze im Atmosphäreprozessor. Die Kolonie ist verloren.', 'bad'); }
      }
    }
    if (this.stage >= 4 && !this.motherSpawned) {
      const h = this.freeHexNear(this.map.nest.c, this.map.nest.r, 'mutter', 3) || [this.map.nest.c, this.map.nest.r];
      if (!this.unitAt(h[0], h[1])) { this.addUnit(2, 'mutter', h[0], h[1]); this.motherSpawned = true; this.events.push({ type: 'banner', text: 'Die Mutter erwacht', sub: 'Im Wrack regt sich etwas Großes' }); this.say('Im Wrack regt sich etwas Großes. Die Mutter ist erwacht.', 'bad'); }
    }
    // Sturm
    if (this.storm.active && R >= this.storm.until) { this.storm.active = false; this.storm.next = R + 8 + Math.floor(Math.random() * 5); this.say('Der Staubsturm legt sich.', 'info'); }
    else if (!this.storm.active && R + 1 >= this.storm.next) { this.storm.active = true; this.storm.until = R + 3; this.say('Staubsturm zieht auf: Alle sehen 1 Feld weniger. Verlasst euch auf die Melder.', 'warn'); }
    this.players[2].credits = Math.floor(this.biomass);
    // Stufenwechsel melden
    const st = this.stage;
    if (st !== this.lastStage) { if (this.lastStage) this.events.push({ type: 'banner', text: `Befall Stufe ${st}`, sub: STAGE_NAMES[st] }); this.lastStage = st; }
    this.checkObjectives(true);
    this.checkEnd();
  }
  burst(u, carrier) {
    const c = u.c, r = u.r, name = this.def(u).name, owner = u.owner;
    this.units = this.units.filter((x) => x !== u);
    if (carrier) { carrier.cargo = carrier.cargo.filter((id) => id !== u.id); }
    this.bursts++; this.befall += 6; this.biomass += 4;
    this.events.push({ type: 'burst', c, r, owner });
    if (owner === 0) this.say(`${name}: Ausbruch! Ein Brutling ist geschlüpft.`, 'bad');
    else if (this.vis[0] && this.vis[0].seen[this.idx(c, r)]) this.say(`Ausbruch bei den ${FACTIONS[this.fac(owner)].short}!`, 'warn');
    if (carrier) this.hurt(carrier, 6, null, 'Ausbruch');
    const h = this.unitAt(c, r) || this.bAt(c, r) ? this.freeHexNear(c, r, 'brutling', 2) : [c, r];
    if (h) { const b = this.addUnit(2, 'brutling', h[0], h[1]); b.lastMove = this.tick; b.revealUntil = this.tick + 3; }
    if (this.fac(owner) === 'marines') this.checkMarines(owner);
    if (owner === 0) this.computeVis(0);
  }
  spreadResin() {
    const n = this.W * this.H, cap = n * 0.3;
    let count = this.resin.reduce((s, v) => s + v, 0);
    if (count >= cap) return;
    const k = Math.round((1 + this.stage * 1.2) * this.diff.brood + Math.random());
    const front = [];
    for (let r = 0; r < this.H; r++) for (let c = 0; c < this.W; c++) {
      const i = this.idx(c, r);
      if (this.resin[i] || this.terr(c, r) === 'chasm' || this.bAt(c, r) || this.fire[i] >= this.round) continue;
      if (neighbors(c, r, this.W, this.H).some(([x, y]) => this.resin[this.idx(x, y)])) front.push(i);
    }
    for (let j = 0; j < k && front.length; j++) {
      const p = front.splice(Math.floor(Math.random() * front.length), 1)[0];
      this.resin[p] = 1; this.befall += 0.3; count++;
    }
    // durch die Schächte
    if (this.stage >= 2) for (const v of this.vents) {
      if (!this.resin[this.idx(v.c, v.r)] || v.sealed) continue;
      for (const l of v.links) { const w = this.vents[l]; if (!w.sealed && !this.resin[this.idx(w.c, w.r)] && Math.random() < 0.12) { this.resin[this.idx(w.c, w.r)] = 1; this.befall += 0.3; } }
    }
  }

  checkEnd() {
    if (this.state) return this.state;
    if (this.coreBlown) {
      this.state = { kind: 'meltdown' };
      return this.state;
    }
    if (this.befall >= 100) {
      this.state = { kind: 'quarantine' };
      this.say('Befall 100 %: Der Orbit verhängt die Quarantäne. Die Kolonie wird sterilisiert.', 'bad');
      return this.state;
    }
    const humans = this.players.filter((p) => p.faction !== 'brut');
    const alive = humans.filter((p) => !p.out);
    if (alive.length === 1) { this.state = { kind: 'win', winner: alive[0].id, why: 'Der Gegner ist ausgeschieden.' }; return this.state; }
    if (alive.length === 0) { this.state = { kind: 'quarantine' }; return this.state; }
    const top = [...alive].sort((a, b) => b.score - a.score);
    if (top[0].score >= this.target && top[0].score > top[1].score) this.state = { kind: 'win', winner: top[0].id, why: `${this.target} Punkte erreicht.` };
    return this.state;
  }

  // ---------- Speichern ----------
  serialize() {
    const enc = (a) => Array.from(a).join(',');
    return JSON.stringify({
      v: 1, seed: this.map.seed, W: this.W, H: this.H, round: this.round, tick: this.tick, nextId: this.nextId, cur: this.cur, order: this.order,
      players: this.players, units: this.units, buildings: this.buildings, sites: this.sites.map((s) => s.owner), vents: this.vents.map((v) => [v.sealed ? 1 : 0, v.sealedBy ?? -1, v.collapsed ? 1 : 0]), charges: this.charges, core: this.core, objOffer: this.objOffer,
      resin: enc(this.resin), fire: enc(this.fire), acid: enc(this.acid), explored: enc(this.explored), ventSeen: [...this.ventSeen], flares: this.flares, blips: this.blips,
      befall: this.befall, biomass: this.biomass, bursts: this.bursts, motherSpawned: this.motherSpawned, storm: this.storm, target: this.target, diff: this.diff, lastStage: this.lastStage, settings: this.settings,
    });
  }
  static restore(map, d) {
    const g = new Game(map, { faction: d.players[0].faction, target: d.target, diff: d.diff });
    Object.assign(g, { round: d.round, tick: d.tick, nextId: d.nextId, cur: d.cur, order: d.order, players: d.players, units: d.units, buildings: d.buildings, flares: d.flares, befall: d.befall, biomass: d.biomass, bursts: d.bursts, motherSpawned: d.motherSpawned, storm: d.storm, lastStage: d.lastStage, settings: d.settings });
    d.sites.forEach((o, i) => { g.sites[i].owner = o; });
    d.vents.forEach((s, i) => { if (Array.isArray(s)) { g.vents[i].sealed = !!s[0]; g.vents[i].sealedBy = s[1]; g.vents[i].collapsed = !!s[2]; } else g.vents[i].sealed = s; });
    g.charges = d.charges || []; g.core = d.core ?? null; g.objOffer = d.objOffer || [];
    const dec = (s, A) => A.from(s.split(',').map(Number));
    g.resin = dec(d.resin, Uint8Array); g.fire = dec(d.fire, Uint16Array); g.acid = dec(d.acid, Uint16Array); g.explored = dec(d.explored, Uint8Array);
    g.ventSeen = new Set(d.ventSeen); g.blips = d.blips || [];
    g.computeVis(0); g.computeVis(1);
    return g;
  }
}
