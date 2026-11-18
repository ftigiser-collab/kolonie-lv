// Kartenerzeugung: Mondoberfläche, Kolonie, Landefeld, Schlüsselorte, Nest, Schachtnetz
import { mulberry32, Noise } from './util.js';
import { neighbors, distance, ring, worldSize } from './hex.js';
import { TERRAIN } from './data.js';

const NAMES = ['Nachtweide', 'Graufels', 'Aschenmulde', 'Schwefelsenke', 'Kaltes Becken', 'Eisenrinne', 'Hoffnungstal', 'Staubkessel', 'Bleiche Ebene', 'Rostgrund'];

export function mapName(seed) {
  const r = mulberry32(seed * 7 + 3);
  return `LV-${100 + Math.floor(r() * 899)} ${NAMES[Math.floor(r() * NAMES.length)]}`;
}

export function generateMap(seed, W, H) {
  const rnd = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const N = new Noise(seed), N2 = new Noise(seed + 99), N3 = new Noise(seed + 7);
  const t = new Array(W * H).fill('dust');
  const idx = (c, r) => r * W + c;
  const inb = (c, r) => c >= 0 && r >= 0 && c < W && r < H;
  const set = (c, r, k) => { if (inb(c, r)) t[idx(c, r)] = k; };
  const get = (c, r) => t[idx(c, r)];

  // Grundgelände
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const h = N.fbm(c * 0.12 + 3, r * 0.14 + 7, 4);
    const crack = Math.abs(N2.fbm(c * 0.09, r * 0.09, 3) - 0.5);
    let k = 'dust';
    if (h > 0.56) k = 'rock';
    if (h > 0.665) k = 'ridge';
    if (crack < 0.018 && h < 0.6 && N3.v(c * 0.3, r * 0.3) > 0.35) k = 'chasm';
    if (k === 'dust' && N3.fbm(c * 0.25, r * 0.25, 2) > 0.66) k = 'rock';
    t[idx(c, r)] = k;
  }

  const side = rnd() < 0.5 ? 'L' : 'R';
  const midR = Math.floor(H / 2);
  const colony = { c: side === 'L' ? 4 : W - 5, r: midR + ri(-3, 3) };
  const lz = { c: side === 'L' ? W - 4 : 3, r: midR + ri(-3, 3) };
  const nestTop = rnd() < 0.5;
  const nest = { c: Math.floor(W / 2) + ri(-2, 2), r: nestTop ? 3 : H - 4 };
  const toward = nestTop ? 1 : -1;
  const sites = [
    { type: 'prozessor', c: Math.floor(W / 2) + ri(-1, 1), r: midR + toward * ri(1, 3) },
    { type: 'labor', c: Math.floor(W / 2) + (rnd() < 0.5 ? -3 : 3), r: nest.r + toward * 4 },
    { type: 'funkmast', c: Math.floor(W / 2) + ri(-2, 2), r: nestTop ? H - 4 : 3 },
    { type: 'mine', c: Math.round(W * 0.3), r: nestTop ? Math.round(H * 0.24) + ri(0, 2) : Math.round(H * 0.76) - ri(0, 2) },
    { type: 'mine', c: Math.round(W * 0.7), r: nestTop ? Math.round(H * 0.24) + ri(0, 2) : Math.round(H * 0.76) - ri(0, 2) },
  ];

  // Plätze freiräumen
  const clear = (c, r, rad, inner, innerK, outerK) => {
    for (const [x, y] of ring(c, r, rad, W, H)) {
      const d = distance(c, r, x, y);
      if (d <= inner) set(x, y, innerK);
      else if (outerK) set(x, y, outerK);
      else if (['ridge', 'chasm', 'wreck'].includes(get(x, y))) set(x, y, 'dust');
    }
  };
  clear(colony.c, colony.r, 4, 2, 'deck', null);
  clear(lz.c, lz.r, 3, 1, 'pad', null);
  for (const s of sites) clear(s.c, s.r, 2, s.type === 'prozessor' ? 1 : 0, 'deck', null);
  clear(nest.c, nest.r, 3, 1, 'wreck', null);
  for (const [x, y] of ring(nest.c, nest.r, 2, W, H)) if (distance(nest.c, nest.r, x, y) === 2 && get(x, y) === 'dust') set(x, y, 'rock');

  // Wege: Fahrwege der Kolonie
  const pathCost = (c, r) => { const k = get(c, r); return k === 'road' ? 0.4 : k === 'dust' || k === 'deck' ? 1 : k === 'rock' ? 2.2 : k === 'ridge' ? 6 : k === 'chasm' ? 9 : 5; };
  function carve(a, b, kind) {
    const dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    const open = [[0, a.c, a.r]]; dist[idx(a.c, a.r)] = 0;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [d, c, r] = open.splice(bi, 1)[0];
      if (c === b.c && r === b.r) break;
      if (d > dist[idx(c, r)]) continue;
      for (const [x, y] of neighbors(c, r, W, H)) {
        const nd = d + pathCost(x, y) + (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 3 : 0);
        if (nd < dist[idx(x, y)]) { dist[idx(x, y)] = nd; prev[idx(x, y)] = idx(c, r); open.push([nd, x, y]); }
      }
    }
    let cur = idx(b.c, b.r);
    while (cur >= 0) {
      const c = cur % W, r = Math.floor(cur / W), k = t[cur];
      if (kind === 'road') { if (k !== 'deck' && k !== 'pad') t[cur] = 'road'; }
      else if (['ridge', 'chasm', 'wreck'].includes(k)) t[cur] = 'rock';
      cur = prev[cur];
    }
  }
  const P = sites[0];
  carve(colony, P, 'road');
  carve(P, sites[3], 'road'); carve(P, sites[4], 'road'); carve(P, sites[2], 'road');
  carve(colony, sites[side === 'L' ? 3 : 4], 'road');
  carve(sites[1], P, 'path'); carve(lz, P, 'path'); carve(nest, sites[1], 'path');
  carve(lz, sites[side === 'L' ? 4 : 3], 'path');

  // Kolonie: Zentrale und Startbauten
  const prebuilt = [{ type: 'zentrale', c: colony.c, r: colony.r }];
  const dirToP = Math.atan2(P.r - colony.r, P.c - colony.c);
  const around = ring(colony.c, colony.r, 2, W, H).filter(([x, y]) => !(x === colony.c && y === colony.r))
    .map(([x, y]) => ({ x, y, d: distance(colony.c, colony.r, x, y), a: Math.atan2(y - colony.r, x - colony.c) }))
    .filter((o) => { let da = Math.abs(o.a - dirToP); if (da > Math.PI) da = Math.PI * 2 - da; return da > 0.7 && get(o.x, o.y) !== 'road'; });
  around.sort((a, b) => a.d - b.d || rnd() - 0.5);
  const want = ['wohnmodul', 'kranken', 'werkstatt', 'wohnmodul', 'geschuetz', 'flutlicht'];
  const used = new Set();
  for (const type of want) {
    const pick = around.find((o) => !used.has(o.x + ',' + o.y) && (type === 'geschuetz' || type === 'flutlicht' ? o.d === 2 : true) &&
      !around.some((q) => used.has(q.x + ',' + q.y) && distance(q.x, q.y, o.x, o.y) === 0));
    if (!pick) continue;
    used.add(pick.x + ',' + pick.y); prebuilt.push({ type, c: pick.x, r: pick.y });
  }

  // Schachtnetz
  const vents = [];
  const occupied = (c, r) => prebuilt.some((b) => b.c === c && b.r === r) || sites.some((s) => s.c === c && s.r === r);
  const okVent = (c, r) => inb(c, r) && !['chasm', 'ridge'].includes(get(c, r)) && !occupied(c, r) && !vents.some((v) => distance(v.c, v.r, c, r) < 3);
  const addVent = (c, r, kind) => { if (okVent(c, r)) { vents.push({ id: vents.length, c, r, kind, links: [], sealed: false }); return true; } return false; };
  const placeNear = (c, r, d0, d1, kind, n = 1) => {
    const cand = ring(c, r, d1, W, H).filter(([x, y]) => distance(c, r, x, y) >= d0).sort(() => rnd() - 0.5);
    let k = 0; for (const [x, y] of cand) { if (k >= n) break; if (addVent(x, y, kind)) k++; }
  };
  placeNear(colony.c, colony.r, 2, 3, 'colony', 2);
  for (const s of sites) placeNear(s.c, s.r, 1, 2, 'site', 1);
  placeNear(nest.c, nest.r, 0, 2, 'nest', 2);
  const caves = Math.round(W * H / 110);
  for (let i = 0, tries = 0; i < caves && tries < 400; tries++) {
    const c = ri(2, W - 3), r = ri(2, H - 3);
    if (distance(c, r, lz.c, lz.r) < 5) continue;
    const k = get(c, r);
    if ((k === 'rock' || neighbors(c, r, W, H).some(([x, y]) => get(x, y) === 'ridge')) && addVent(c, r, 'cave')) i++;
  }
  // Minimaler Spannbaum plus Querverbindungen
  const inTree = new Set([0]);
  while (inTree.size < vents.length) {
    let best = null;
    for (const a of inTree) for (const v of vents) {
      if (inTree.has(v.id)) continue;
      const d = distance(vents[a].c, vents[a].r, v.c, v.r);
      if (!best || d < best.d) best = { a, b: v.id, d };
    }
    vents[best.a].links.push(best.b); vents[best.b].links.push(best.a); inTree.add(best.b);
  }
  for (const v of vents) {
    const others = vents.filter((o) => o !== v && !v.links.includes(o.id)).sort((a, b) => distance(v.c, v.r, a.c, a.r) - distance(v.c, v.r, b.c, b.r));
    if (others[0] && distance(v.c, v.r, others[0].c, others[0].r) <= 8 && rnd() < 0.45) { v.links.push(others[0].id); others[0].links.push(v.id); }
  }

  return { W, H, seed, name: mapName(seed), t, sites, vents, colony, lz, nest, side, prebuilt, size: worldSize(W, H), terrain: (c, r) => TERRAIN[t[r * W + c]] };
}
