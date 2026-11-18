// KI: Gegnerfraktion (Siedler oder Marines) und die Brut als Umweltgefahr
import { UNITS, BUILDINGS, SITES, BROOD } from './data.js';
import { distance, neighbors, ring } from './hex.js';

export function* aiTurn(g, pid) {
  if (g.fac(pid) === 'brut') yield* brutTurn(g, pid);
  else yield* humanTurn(g, pid);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ======================= Menschliche Gegner =======================
function* humanTurn(g, pid) {
  const ctx = { fields: new Map(), assigned: new Map() };
  buyPhase(g, pid);
  yield 'buy';
  const order = { schiff: 0, werfer: 1, smartgun: 1, schuetze: 2, miliz: 2, brenner: 2, unteroff: 3, spaeher: 3, lademech: 3, panzerwagen: 3, schlepper: 4, sani: 5, techniker: 6, pionier: 6 };
  const units = g.units.filter((u) => u.owner === pid && !u.inside).sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));
  for (const u of units) {
    if (g.state || !g.units.includes(u) || u.inside) continue;
    const did = actHuman(g, u, ctx);
    if (did) yield u.id;
  }
  buyPhase(g, pid);
  yield 'buy2';
}

function armyCap(g) { return 12 + Math.floor(g.round / 2); }

function buyPhase(g, pid) {
  const p = g.players[pid], f = p.faction;
  const mine = g.units.filter((u) => u.owner === pid);
  const count = (t) => mine.filter((u) => u.type === t).length;
  let guard = 0;
  while (guard++ < 8 && mine.length < armyCap(g)) {
    const sps = g.spawnPoints(pid);
    if (!sps.length) return;
    let type;
    if (f === 'siedler') {
      const enemyShips = g.units.some((u) => u.type === 'schiff' && u.owner !== pid);
      const ws = sps.find((s) => s.type === 'werkstatt');
      const bag = ['miliz', 'miliz', 'miliz', 'brenner', 'brenner', 'spaeher'];
      if (enemyShips && count('werfer') < 2) bag.push('werfer');
      if (count('techniker') < 2) bag.push('techniker');
      if (ws && p.credits > 700 && count('lademech') < 3) bag.push('lademech', 'lademech');
      if (ws && p.credits > 700 && count('schlepper') < 1 && g.round > 4) bag.push('schlepper');
      type = pick(bag);
    } else {
      const bag = ['schuetze', 'schuetze', 'schuetze', 'smartgun', 'smartgun'];
      if (count('unteroff') < 2) bag.push('unteroff');
      if (count('sani') < 2) bag.push('sani');
      if (count('pionier') < 2) bag.push('pionier', 'pionier');
      if (p.credits > 1000 && count('panzerwagen') < 2) bag.push('panzerwagen');
      if (count('schiff') < 2 && p.credits > 1900 && g.buildings.some((b) => b.owner === pid && b.type === 'fob')) type = 'schiff';
      else type = pick(bag);
    }
    const reserve = g.round > 3 ? 120 : 0;
    if (p.credits - UNITS[type].cost < reserve) {
      const cheap = f === 'siedler' ? 'miliz' : 'schuetze';
      if (p.credits - UNITS[cheap].cost < reserve) return;
      type = cheap;
    }
    // Spawnpunkt nahe der Front bevorzugen
    const front = frontSite(g, pid);
    const cands = sps.filter((s) => g.canBuy(pid, type, s)).sort((a, b) => distance(a.c, a.r, front.c, front.r) - distance(b.c, b.r, front.c, front.r));
    if (!cands.length) { if (type === 'schiff') continue; return; }
    const u = g.buy(pid, type, cands[0]);
    if (!u) return;
    mine.push(u);
  }
}

function frontSite(g, pid) {
  const sites = g.sites.filter((s) => s.owner !== pid);
  const base = homeOf(g, pid);
  if (!sites.length) return g.sites[0];
  return sites.sort((a, b) => (distance(base.c, base.r, a.c, a.r) - SITES[a.type].pts * 3) - (distance(base.c, base.r, b.c, b.r) - SITES[b.type].pts * 3))[0];
}
function homeOf(g, pid) {
  return g.fac(pid) === 'siedler' ? g.map.colony : g.map.lz;
}

function field(g, ctx, u, c, r) {
  const cls = g.def(u).cls, key = `${cls}:${c},${r}`;
  if (!ctx.fields.has(key)) ctx.fields.set(key, g.distField(u, c, r));
  return ctx.fields.get(key);
}

function objectiveOf(g, u, ctx) {
  const pid = u.owner, d = g.def(u), f = g.fac(pid);
  // Befallene zur Heilung
  if (u.host) {
    const cures = g.buildings.filter((b) => b.owner === pid && BUILDINGS[b.type].cure && !b.progress);
    const ships = g.units.filter((s) => s.owner === pid && s.type === 'schiff' && s.landed);
    const all = [...cures, ...ships].sort((a, b) => distance(a.c, a.r, u.c, u.r) - distance(b.c, b.r, u.c, u.r));
    if (all.length) return { c: all[0].c, r: all[0].r, kind: 'cure', ref: all[0] };
  }
  if (d.ammo && u.ammo === 0) {
    const pts = [...g.buildings.filter((b) => b.owner === pid && b.type === 'fob'), ...g.units.filter((s) => s.owner === pid && s.type === 'schiff' && s.landed && s !== u)];
    pts.push({ c: g.map.lz.c, r: g.map.lz.r });
    pts.sort((a, b) => distance(a.c, a.r, u.c, u.r) - distance(b.c, b.r, u.c, u.r));
    return { c: pts[0].c, r: pts[0].r, kind: 'ammo' };
  }
  // Wächter bleibt auf eigenem Ort
  const here = g.siteAt(u.c, u.r);
  if (here && (here.owner === pid || here.owner === -1) && d.cls !== 'air') return { c: u.c, r: u.r, kind: 'guard' };
  if (f === 'siedler' && u.type === 'techniker') {
    const z = g.buildings.find((b) => b.owner === pid && b.type === 'zentrale');
    const owned = g.sites.filter((s) => s.owner === pid);
    if (owned.length && Math.random() < 0.6) { const s = owned[u.id % owned.length]; return { c: s.c, r: s.r, kind: 'support' }; }
    if (z) return { c: z.c, r: z.r, kind: 'support' };
  }
  // Ort wählen: Wert / Entfernung, nicht alle auf denselben
  let best = null;
  for (const s of g.sites) {
    const occ = g.unitAt(s.c, s.r);
    if (s.owner === pid && occ && occ.owner === pid) continue;
    const n = ctx.assigned.get(s.id) || 0;
    const dd = distance(u.c, u.r, s.c, s.r);
    const v = (SITES[s.type].pts * 6 + (s.owner === pid ? 2 : s.owner === -1 ? 5 : 7)) / (dd + 4) - n * 0.35;
    if (!best || v > best.v) best = { v, s };
  }
  // Gegnerische Basis angreifen, wenn stark
  const mine = g.units.filter((x) => x.owner === pid).length;
  const foe = g.players.find((p) => p.faction !== 'brut' && p.id !== pid);
  if (foe && !foe.out && mine >= 10 && Math.random() < 0.25) {
    const fz = g.buildings.find((b) => b.owner === foe.id && (b.type === 'zentrale' || b.type === 'fob'));
    if (fz) return { c: fz.c, r: fz.r, kind: 'raid' };
  }
  if (!best) return { c: g.sites[0].c, r: g.sites[0].r, kind: 'site' };
  ctx.assigned.set(best.s.id, (ctx.assigned.get(best.s.id) || 0) + 1);
  return { c: best.s.c, r: best.s.r, kind: 'site', site: best.s };
}

function targetValue(g, u, t, from) {
  const f = g.forecast(u, t);
  const max = g.maxHp(t);
  let v = f.dmg / max * 10 + (f.kill ? 8 : 0) - f.ctr * 0.6;
  if (t.isBld) v += t.type === 'zentrale' ? 3 : t.type === 'fob' ? 3 : BUILDINGS[t.type].sentry ? 2 : 0;
  if (!t.isBld && g.isXeno(t)) v += t.type === 'mutter' ? 6 : t.type === 'ei' ? 3 : 1.5;
  if (!t.isBld && t.type === 'schiff') v += 2;
  if (!t.isBld && t.host) v -= 1;
  return v;
}

function dangerAt(g, u, c, r) {
  let dz = 0;
  for (const x of g.units) {
    if (x.owner === u.owner || x.inside) continue;
    const dd = distance(x.c, x.r, c, r);
    if (g.isXeno(x) && x.type !== 'ei') { if (dd <= (x.inVent ? 1 : 2)) dz += x.type === 'klammerer' ? (g.def(u).cls === 'inf' ? 3 : 0) : 1.5; }
  }
  for (const b of g.buildings) { const s = BUILDINGS[b.type].sentry; if (s && b.owner !== u.owner && !b.progress && b.ammo && distance(b.c, b.r, c, r) <= s.rng) dz += 2; }
  return dz;
}

function actHuman(g, u, ctx) {
  const d = g.def(u), pid = u.owner;
  if (u.type === 'schiff') return actShip(g, u, ctx);
  // Vorab: Sonderaktionen ohne Bewegung
  if (preActions(g, u)) return true;
  const obj = objectiveOf(g, u, ctx);
  // Befallener neben Schiff: einsteigen
  if (obj.kind === 'cure' && obj.ref && !obj.ref.isBld && g.canBoard(u, obj.ref)) { g.board(u, obj.ref); return true; }
  const reach = g.reachable(u);
  const fld = field(g, ctx, u, obj.c, obj.r);
  const d0 = fld[g.idx(u.c, u.r)];
  let best = null;
  for (const [, h] of reach) {
    if (!h.end) continue;
    let s = 0;
    const ts = g.targetsFrom(u, h.c, h.r, true);
    let bt = null;
    for (const t of ts) { const v = targetValue(g, u, t, h); if (!bt || v > bt.v) bt = { v, t }; }
    if (bt) s += bt.v + 2;
    const dd = fld[g.idx(h.c, h.r)];
    if (isFinite(dd) && isFinite(d0)) s += (d0 - dd) * (obj.kind === 'cure' || obj.kind === 'ammo' ? 2.2 : 1.1);
    else if (isFinite(dd)) s += 2;
    s += g.coverAt({ c: h.c, r: h.r, type: u.type, owner: u.owner }) * 4;
    s -= dangerAt(g, u, h.c, h.r) * (d.cls === 'inf' ? 1.2 : 0.5);
    const site = g.siteAt(h.c, h.r);
    if (site && site.owner !== pid) s += 9;
    if (site && site.owner === pid && !g.unitAt(site.c, site.r)) s += 4;
    if (g.resin[g.idx(h.c, h.r)]) s -= 1;
    if (obj.kind === 'guard' && (h.c !== u.c || h.r !== u.r)) s -= 6;
    if (u.host && obj.kind === 'cure' && distance(h.c, h.r, obj.c, obj.r) <= 1) s += 10;
    s += Math.random() * 0.4;
    if (!best || s > best.s) best = { s, h, bt };
  }
  let did = false;
  if (best && (best.h.c !== u.c || best.h.r !== u.r)) { g.moveUnit(u, best.h.c, best.h.r, reach); did = true; }
  if (!g.units.includes(u) || g.state) return true;
  // Angriff
  const ts = g.targetsFrom(u, u.c, u.r, true);
  if (ts.length && !u.acted) {
    let bt = null;
    for (const t of ts) { const v = targetValue(g, u, t); if (!bt || v > bt.v) bt = { v, t }; }
    if (bt && bt.v > -2) { g.attack(u, bt.t); return true; }
  }
  if (!u.acted && postActions(g, u)) return true;
  return did;
}

function preActions(g, u) {
  const pid = u.owner;
  // Sanitäter: Befallene stabilisieren, Verletzte heilen
  const ht = g.healTargets(u);
  if (ht.length) { g.heal(u, ht.sort((a, b) => (b.host ? 10 : 0) - (a.host ? 10 : 0) + a.hp - b.hp)[0]); return true; }
  // Leuchtfackel auf versteckte Brut in der Nähe
  if (u.flares > 0 && !u.acted && Math.random() < 0.5) {
    const xs = g.units.filter((x) => g.isXeno(x) && g.onMap(x) && x.type !== 'ei' && distance(x.c, x.r, u.c, u.r) <= 4 && !g.lit[g.idx(x.c, x.r)]);
    if (xs.length >= 1) { const x = xs[0]; g.flare(u, x.c, x.r); return true; }
  }
  return false;
}

function postActions(g, u) {
  const pid = u.owner, p = g.players[pid], f = g.fac(pid);
  // Pionier: FOB errichten
  if (g.def(u).abil?.includes('fob')) {
    const fobs = g.buildings.filter((b) => b.owner === pid && b.type === 'fob').length;
    const want = g.round < 8 ? 1 : 2;
    const front = frontSite(g, pid);
    if (fobs < want && distance(u.c, u.r, front.c, front.r) <= 4 && distance(u.c, u.r, g.map.lz.c, g.map.lz.r) >= 5) {
      const hs = g.fobHexes(u);
      if (hs.length) { g.build(u, 'fob', ...hs[0]); return true; }
    }
  }
  // Instandsetzen
  const rt = g.repairTargets(u);
  if (rt.length) { g.repair(u, rt[0]); return true; }
  // Schacht verschweißen in Basisnähe
  const wt = g.weldTargets(u);
  if (wt.length && Math.random() < 0.6) {
    const home = homeOf(g, pid);
    const near = wt.find((v) => distance(v.c, v.r, home.c, home.r) <= 5 || g.buildings.some((b) => b.owner === pid && distance(b.c, b.r, v.c, v.r) <= 3));
    if (near) { g.weld(u, near); return true; }
  }
  // Bauen
  if (g.def(u).abil?.includes('build') && p.credits > 300) {
    const mine = g.buildings.filter((b) => b.owner === pid);
    const cnt = (t) => mine.filter((b) => b.type === t).length;
    const bag = [];
    if (cnt('geschuetz') < 2 + g.round / 5) bag.push('geschuetz', 'geschuetz');
    if (cnt('flutlicht') < 2 + g.round / 6) bag.push('flutlicht');
    if (f === 'siedler' && cnt('wohnmodul') < 4 && p.credits > 450) bag.push('wohnmodul');
    if (f === 'marines' && cnt('sanizelt') < cnt('fob')) bag.push('sanizelt', 'sanizelt');
    if (cnt('sensor') < 1 && g.round > 5) bag.push('sensor');
    if (bag.length && Math.random() < 0.7) {
      const t = pick(bag);
      const hs = g.buildHexes(u, t);
      if (hs.length) { g.build(u, t, ...pick(hs)); return true; }
    }
  }
  // Harz abbrennen
  const bt = g.burnTargets(u);
  if (bt.length) { g.burn(u, ...bt[0]); return true; }
  return false;
}

function actShip(g, s, ctx) {
  const pid = s.owner;
  if (s.landed) {
    if (s.cargo.length && g.canUnload(s)) { g.unloadAll(s); return true; }
    const hurt = s.hp < g.def(s).hp * 0.45;
    const fwd = shipPoint(g, pid, s);
    const onPad = g.terr(s.c, s.r) === 'pad';
    if (hurt && onPad) return false;
    if (!hurt && distance(s.c, s.r, fwd.c, fwd.r) <= 2) {
      // Am Nachschubpunkt bleiben, ggf. aus dem Stand feuern
      const ts = g.targetsFrom(s, s.c, s.r, true);
      if (ts.length) { g.attack(s, ts.sort((a, b) => targetValue(g, s, b) - targetValue(g, s, a))[0]); return true; }
      return false;
    }
  }
  const hurt = s.hp < g.def(s).hp * 0.45;
  const dest = hurt ? g.map.lz : shipPoint(g, pid, s);
  const reach = g.reachable(s);
  let best = null;
  for (const [, h] of reach) {
    if (!h.end) continue;
    let v = -distance(h.c, h.r, dest.c, dest.r) * 1.5;
    v -= dangerAt(g, s, h.c, h.r) * 0.3;
    const ts = g.targetsFrom(s, h.c, h.r, true);
    if (ts.length && !hurt) v += 3;
    if (!best || v > best.v) best = { v, h };
  }
  if (best && (best.h.c !== s.c || best.h.r !== s.r)) g.moveUnit(s, best.h.c, best.h.r, reach);
  if (!g.units.includes(s)) return true;
  if (distance(s.c, s.r, dest.c, dest.r) <= 2 && g.canLand(s)) { g.land(s); return true; }
  const ts = g.targetsFrom(s, s.c, s.r, true);
  if (ts.length && !s.acted) g.attack(s, ts.sort((a, b) => targetValue(g, s, b) - targetValue(g, s, a))[0]);
  return true;
}
function shipPoint(g, pid, s) {
  const ships = g.units.filter((u) => u.owner === pid && u.type === 'schiff').sort((a, b) => a.id - b.id);
  const front = frontSite(g, pid), lz = g.map.lz;
  const k = ships.indexOf(s) === 0 ? 0.62 : 0.4;
  const tc = Math.round(lz.c + (front.c - lz.c) * k), tr = Math.round(lz.r + (front.r - lz.r) * k);
  // landbares Feld in der Nähe suchen
  for (let d = 0; d <= 3; d++) for (const [c, r] of ring(tc, tr, d, g.W, g.H)) if (g.terr(c, r) !== 'ridge' && g.terr(c, r) !== 'chasm' && g.terr(c, r) !== 'wreck' && !g.bAt(c, r) && !g.resin[g.idx(c, r)]) return { c, r };
  return { c: tc, r: tr };
}

// ======================= Die Brut =======================
function* brutTurn(g, pid) {
  broodSpawn(g, pid);
  yield 'spawn';
  const xs = g.units.filter((u) => u.owner === pid && u.type !== 'ei').sort((a, b) => (a.type === 'klammerer' ? 0 : 1) - (b.type === 'klammerer' ? 0 : 1));
  for (const u of xs) {
    if (g.state || !g.units.includes(u)) continue;
    const did = actXeno(g, u);
    if (did) yield u.id;
  }
}

function prey(g, x) {
  return g.units.filter((t) => t.owner !== x.owner && g.onMap(t) && !g.isXeno(t) && !g.flying(t) && !t.host);
}

function broodSpawn(g, pid) {
  const st = g.stage, brood = g.diff.brood || 1;
  const mobile = g.units.filter((u) => u.owner === pid && u.type !== 'ei').length;
  const eggs = g.units.filter((u) => u.owner === pid && u.type === 'ei').length;
  const cap = Math.round((5 + st * 3) * brood);
  const eggCap = (st + 1) * 2;
  const nest = g.map.nest;
  // Mutter legt Eier
  const mom = g.units.find((u) => u.type === 'mutter');
  if (mom && eggs < eggCap + 4) {
    const h = neighbors(mom.c, mom.r, g.W, g.H).find(([c, r]) => !g.unitAt(c, r) && !g.bAt(c, r) && g.terr(c, r) !== 'chasm');
    if (h) { g.addUnit(pid, 'ei', h[0], h[1]); g.resin[g.idx(h[0], h[1])] = 1; }
  }
  let guard = 0;
  while (guard++ < 6) {
    let type = null;
    const opts = [];
    if (mobile + guard - 1 < cap) {
      if (st >= 1) opts.push('laeufer', 'laeufer');
      if (st >= 2) opts.push('jaeger', 'jaeger', 'jaeger');
      if (st >= 3) opts.push('brecher');
    }
    if (eggs + guard - 1 < eggCap) opts.push('ei');
    if (!opts.length) break;
    type = pick(opts);
    const cost = BROOD[type].b;
    if (g.biomass < cost) break;
    // Spawnort: Nest oder Schachtknoten auf Harz (im Schacht)
    if (type === 'ei') {
      const spots = [];
      for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) if (g.resin[g.idx(c, r)] && !g.unitAt(c, r) && !g.bAt(c, r) && !g.ventAt(c, r) && !g.siteAt(c, r) && g.terr(c, r) !== 'chasm') spots.push([c, r]);
      // nicht direkt vor die Läufe der Menschen
      const ok = spots.filter(([c, r]) => !g.units.some((u) => !g.isXeno(u) && g.onMap(u) && distance(u.c, u.r, c, r) <= 3));
      if (!ok.length) break;
      const [c, r] = pick(ok);
      g.addUnit(pid, 'ei', c, r);
    } else {
      const vents = g.vents.filter((v) => g.resin[g.idx(v.c, v.r)] && !v.sealed);
      if (vents.length && Math.random() < 0.6) {
        const v = pick(vents);
        const u = g.addUnit(pid, type, v.c, v.r); u.inVent = true; u.ventId = v.id; u.lastMove = g.tick; u.ventTick = g.tick;
      } else {
        const h = g.freeHexNear(nest.c, nest.r, type, 3);
        if (!h) break;
        const u = g.addUnit(pid, type, h[0], h[1]); u.lastMove = g.tick;
      }
    }
    g.biomass -= cost;
  }
  g.players[pid].credits = Math.floor(g.biomass);
}

function preyValue(g, x, t) {
  if (t.isBld) {
    const d = BUILDINGS[t.type];
    return 2 + (t.type === 'flutlicht' ? 3 : d.sentry ? 2 : t.type === 'wohnmodul' ? 2.5 : 0) + (1 - t.hp / d.hp) * 2;
  }
  const d = g.def(t);
  let v = 6 + (1 - t.hp / d.hp) * 5 + (d.cls === 'inf' ? 2 : d.cls === 'veh' ? -1 : 0);
  const friends = g.units.filter((o) => o.owner === t.owner && o !== t && g.onMap(o) && distance(o.c, o.r, t.c, t.r) <= 2).length;
  v += friends === 0 ? 3 : -friends * 0.8;
  if (t.type === 'schiff') v += 2;
  return v;
}
function hexRisk(g, x, c, r) {
  let k = 0;
  const i = g.idx(c, r);
  if (g.lit[i]) k += 2.5;
  if (g.acid[i] >= g.round) k += 0.5;
  if (g.fire[i] >= g.round) k += 6;
  for (const b of g.buildings) { const s = BUILDINGS[b.type].sentry; if (s && !b.progress && b.ammo && distance(b.c, b.r, c, r) <= s.rng) k += 3; }
  for (const w of g.units) if (w.type === 'smartgun' && w.watchReady && w.ammo && distance(w.c, w.r, c, r) <= 3 && distance(w.c, w.r, c, r) >= 1) k += 2;
  return k;
}

function strike(g, x, budgetReach) {
  const reach = budgetReach || g.reachable(x);
  const targets = [...prey(g, x), ...(x.type === 'klammerer' || x.type === 'brutling' ? [] : g.buildings)];
  let best = null;
  for (const t of targets) {
    if (!g.canHit(x, t)) continue;
    if (distance(x.c, x.r, t.c, t.r) > g.moveOf(x) + 1) continue;
    const pv = preyValue(g, x, t);
    for (const [c, r] of neighbors(t.c, t.r, g.W, g.H)) {
      const h = reach.get(g.idx(c, r));
      if (!h || !h.end) continue;
      const v = pv - hexRisk(g, x, c, r) * (x.type === 'brecher' || x.type === 'mutter' ? 0.4 : 1) + Math.random() * 0.5;
      if (!best || v > best.v) best = { v, t, h };
    }
  }
  return best && best.v > (x.type === 'klammerer' ? 0 : 2.5) ? { ...best, reach } : null;
}

function actXeno(g, x) {
  const d = g.def(x);
  const humans = prey(g, x);
  const nearest = (c, r) => humans.reduce((b, t) => { const dd = distance(c, r, t.c, t.r); return !b || dd < b.d ? { t, d: dd } : b; }, null);

  if (x.type === 'mutter') {
    const ts = g.targetsFrom(x, x.c, x.r, false);
    if (ts.length) { g.attack(x, ts[0]); return true; }
    return false;
  }

  // Im Schacht: auftauchen, weiterkriechen oder lauern
  if (x.inVent) {
    const R = g.ventReach(x.ventId, d.vent || 0);
    let best = null;
    for (const [id] of R) {
      const v = g.vents[id];
      if (g.unitAt(v.c, v.r) || g.bAt(v.c, v.r)) continue;
      const n = nearest(v.c, v.r);
      if (!n) continue;
      const score = (n.d <= 3 ? 10 - n.d * 1.5 + preyValue(g, x, n.t) * 0.4 : -n.d) - hexRisk(g, x, v.c, v.r);
      if (!best || score > best.score) best = { score, id, n };
    }
    if (x.type === 'brutling') return false;
    if (best && best.score > 7.5) {
      g.ventTravel(x, best.id, false);
      if (!g.units.includes(x)) return true;
      const s = strike(g, x);
      if (s) { g.moveUnit(x, s.h.c, s.h.r, s.reach); if (g.units.includes(x) && g.canHit(x, s.t) && distance(x.c, x.r, s.t.c, s.t.r) <= 1) g.attack(x, s.t); }
      return true;
    }
    // weiter Richtung Beute kriechen oder still bleiben
    if (best && Math.random() < 0.45) {
      const all = [...R.keys()].map((id) => g.vents[id]);
      const tgt = humans.length ? nearest(g.vents[x.ventId].c, g.vents[x.ventId].r) : null;
      if (tgt) {
        const closer = all.sort((a, b) => distance(a.c, a.r, tgt.t.c, tgt.t.r) - distance(b.c, b.r, tgt.t.c, tgt.t.r))[0];
        if (closer && closer.id !== x.ventId) { g.ventTravel(x, closer.id, true); return true; }
      }
    }
    if (!humans.length || Math.random() < 0.25) {
      // gelegentlich auftauchen und umherstreifen
      const v = g.vents[x.ventId];
      if (!g.unitAt(v.c, v.r) && !g.bAt(v.c, v.r) && Math.random() < 0.5) { g.ventTravel(x, v.id, false); return true; }
    }
    return false;
  }

  // Brutling: in den nächsten Schacht fliehen
  if (x.type === 'brutling') {
    const v = g.ventAt(x.c, x.r);
    if (v && !v.sealed) { const R = g.ventReach(v.id, d.vent); const far = [...R.keys()].sort((a, b) => R.get(b) - R.get(a))[0]; g.ventTravel(x, far ?? v.id, true); return true; }
    const reach = g.reachable(x);
    const vents = g.vents.filter((w) => !w.sealed);
    let best = null;
    for (const [, h] of reach) {
      if (!h.end) continue;
      const vd = Math.min(...vents.map((w) => distance(w.c, w.r, h.c, h.r)));
      const n = nearest(h.c, h.r);
      const s = -vd * 2 + (n ? Math.min(n.d, 5) : 5);
      if (!best || s > best.s) best = { s, h };
    }
    if (best && (best.h.c !== x.c || best.h.r !== x.r)) { g.moveUnit(x, best.h.c, best.h.r, reach); return true; }
    return false;
  }

  // Zuschlagen?
  const s = strike(g, x);
  if (s) {
    if (s.h.c !== x.c || s.h.r !== x.r) g.moveUnit(x, s.h.c, s.h.r, s.reach);
    if (g.units.includes(x) && g.alive(s.t) && distance(x.c, x.r, s.t.c, s.t.r) <= 1 && g.canHit(x, s.t)) g.attack(x, s.t);
    return true;
  }
  // Verschweißten Schacht aufbrechen
  const br = g.breakTargets(x);
  if (br.length && Math.random() < 0.5) { g.breakVent(x, br[0]); return true; }

  const n = nearest(x.c, x.r);
  const v = g.ventAt(x.c, x.r);
  // In den Schacht und näher heran
  if (v && !v.sealed && (d.vent || 0) > 0 && n && (n.d > 4 || Math.random() < 0.35)) {
    const R = g.ventReach(v.id, d.vent);
    const opts = [...R.keys()].map((id) => g.vents[id]).sort((a, b) => distance(a.c, a.r, n.t.c, n.t.r) - distance(b.c, b.r, n.t.c, n.t.r));
    if (opts.length && opts[0].id !== v.id && distance(opts[0].c, opts[0].r, n.t.c, n.t.r) < n.d) { g.ventTravel(x, opts[0].id, true); return true; }
    if (Math.random() < 0.5) { g.ventTravel(x, v.id, true); return true; }
  }
  // Lauern: still halten erzeugt kein Signal
  if (n && n.d <= 6 && Math.random() < 0.55 && !g.lit[g.idx(x.c, x.r)]) return false;
  // Pirschen oder umherstreifen
  const reach = g.reachable(x);
  let goal = n ? n.t : null;
  if (!goal || n.d > 14) {
    const vents = g.vents.filter((w) => !w.sealed && (d.vent || 0) > 0);
    const s2 = g.sites[Math.floor(x.id % g.sites.length)];
    goal = vents.length && Math.random() < 0.6 ? vents.sort((a, b) => distance(a.c, a.r, x.c, x.r) - distance(b.c, b.r, x.c, x.r))[Math.min(1, vents.length - 1)] : s2;
  }
  let best = null;
  const d0 = distance(x.c, x.r, goal.c, goal.r);
  for (const [, h] of reach) {
    if (!h.end) continue;
    const dd = distance(h.c, h.r, goal.c, goal.r);
    let sc = (d0 - dd) * 1.2 - hexRisk(g, x, h.c, h.r) * 1.2 + (g.resin[g.idx(h.c, h.r)] ? 0.6 : 0) + g.coverAt({ c: h.c, r: h.r, type: x.type, owner: x.owner }) * 2;
    if (n && dd <= 1) sc -= 2;
    sc += Math.random() * 0.6;
    if (!best || sc > best.sc) best = { sc, h };
  }
  if (best && (best.h.c !== x.c || best.h.r !== x.r)) { g.moveUnit(x, best.h.c, best.h.r, reach); return true; }
  return false;
}
