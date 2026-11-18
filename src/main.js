// Einstieg: Menü, Gefechtsplanung, Spielstände, Spielschleife
import { generateMap } from './map.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Controller } from './ui.js';
import { FACTIONS, TARGETS, DIFFICULTY } from './data.js';
import { center } from './hex.js';
import { iconCanvas } from './sprites.js';

const $ = (s) => document.querySelector(s);
const MAPS = { klein: [30, 22], mittel: [36, 26], gross: [42, 30] };
const AUTO = 'schachtbrut-save', SLOT = (k) => `schachtbrut-slot-${k}`;

// ---------- Menühintergrund: Bewegungsmelder ----------
let menuAnim = true;
(function menuBg() {
  const cv = $('#menubg'), ctx = cv.getContext('2d');
  const blips = Array.from({ length: 7 }, () => ({ a: Math.random() * 6.28, d: 0.25 + Math.random() * 0.6, t: Math.random() * 3 }));
  let t = 0, last = performance.now();
  function frame(now) {
    if (!menuAnim) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(4,8,6,0.25)'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 1.02, R = Math.max(w, h) * 0.95;
    ctx.strokeStyle = 'rgba(93,255,154,0.08)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 6, Math.PI, Math.PI * 2); ctx.stroke(); }
    const sweep = Math.PI + ((t * 0.5) % 1) * Math.PI;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, 'rgba(93,255,154,0)'); g.addColorStop(1, 'rgba(93,255,154,0.06)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, sweep - 0.25, sweep); ctx.closePath(); ctx.fill();
    for (const b of blips) {
      b.t += dt; if (b.t > 3.5) { b.t = 0; b.a = Math.PI + 0.2 + Math.random() * (Math.PI - 0.4); b.d = Math.max(0.15, b.d - 0.08 - Math.random() * 0.1); if (b.d < 0.18) b.d = 0.5 + Math.random() * 0.4; }
      const x = cx + Math.cos(b.a) * R * b.d, y = cy + Math.sin(b.a) * R * b.d, k = b.t / 3.5;
      ctx.fillStyle = `rgba(160,255,190,${0.9 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.28); ctx.fill();
      ctx.strokeStyle = `rgba(93,255,154,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, 4 + k * 26, 0, 6.28); ctx.stroke();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

let opts = { faction: 'siedler', map: 'mittel', target: 'normal', diff: 'normal', seed: '' };
try { opts = { ...opts, ...JSON.parse(localStorage.getItem('schachtbrut-opts') || '{}') }; } catch {}

function readSave(key) { try { const d = JSON.parse(localStorage.getItem(key) || 'null'); return d && d.v === 1 ? d : null; } catch { return null; } }
const auto = readSave(AUTO);
if (auto) { const c = $('#continue'); c.style.display = 'block'; c.textContent = `Fortsetzen (Runde ${auto.round}, ${FACTIONS[auto.players[0].faction].short})`; c.onclick = () => start(auto); }

function seg(id, values, labels) {
  return `<div class="seg" data-opt="${id}">${values.map((v, i) => `<button data-v="${v}" class="${String(opts[id]) === String(v) ? 'on' : ''}">${labels[i]}</button>`).join('')}</div>`;
}
function showSetup() {
  const el = $('#setup');
  const fac = (f) => `<button data-fac="${f}" class="${opts.faction === f ? 'on' : ''}" style="--c:${FACTIONS[f].color}"><span class="fic" data-f="${f}"></span><b>${FACTIONS[f].name}</b><span>${FACTIONS[f].desc}</span><em>${FACTIONS[f].perk}</em></button>`;
  el.innerHTML = `<div class="box"><button class="close">×</button><h2>Gefecht planen</h2>
    <div class="m-label">Eure Seite — die andere spielt die KI, die Brut ist gegen alle</div>
    <div class="facgrid">${fac('siedler')}${fac('marines')}</div>
    <div class="m-label">Punkteziel</div>${seg('target', ['kurz', 'normal', 'lang'], [`Kurz · ${TARGETS.kurz}`, `Normal · ${TARGETS.normal}`, `Lang · ${TARGETS.lang}`])}
    <div class="m-label">Karte</div>${seg('map', ['klein', 'mittel', 'gross'], ['Klein', 'Mittel', 'Groß'])}
    <div class="m-label">Schwierigkeit</div>${seg('diff', ['leicht', 'normal', 'schwer'], ['Leicht', 'Normal', 'Schwer'])}
    <div class="m-hint">Schwierigkeit wirkt auf die Kasse der gegnerischen KI und auf die Wachstumsrate der Brut.</div>
    <div class="m-label">Kartennummer (optional)</div><input id="seed" placeholder="Zufällig — oder Zahl/Wort eingeben" autocomplete="off" value="${opts.seed || ''}">
    <div class="row"><button id="sback">Zurück</button><button id="sgo" class="primary">Gefecht starten</button></div></div>`;
  el.classList.add('show');
  el.querySelectorAll('.fic').forEach((s) => { const f = s.dataset.f; s.replaceWith(iconCanvas('unit', f === 'siedler' ? 'miliz' : 'schuetze', FACTIONS[f].color, 70, 52)); });
  el.querySelector('.close').onclick = el.querySelector('#sback').onclick = () => el.classList.remove('show');
  el.querySelectorAll('[data-fac]').forEach((b) => b.onclick = () => { opts.faction = b.dataset.fac; el.querySelectorAll('[data-fac]').forEach((x) => x.classList.toggle('on', x === b)); });
  el.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.onclick = () => { opts[sg.dataset.opt] = b.dataset.v; sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
  el.querySelector('#sgo').onclick = () => {
    opts.seed = el.querySelector('#seed').value.trim();
    try { localStorage.setItem('schachtbrut-opts', JSON.stringify(opts)); } catch {}
    el.classList.remove('show'); start();
  };
}
function showSlots(game) {
  const el = $('#gmenu');
  let html = `<div class="box"><button class="close">×</button><h2>${game ? 'Menü' : 'Spielstände'}</h2>`;
  if (auto && !game) html += `<div class="slot"><span class="sn">Auto</span><div class="si">Runde ${auto.round} · ${FACTIONS[auto.players[0].faction].name} · ${auto.players[0].score}:${auto.players[1].score}</div><div class="sb"><button class="primary" data-load="auto">Laden</button></div></div>`;
  for (let k = 1; k <= 3; k++) {
    const d = readSave(SLOT(k));
    html += `<div class="slot"><span class="sn">${k}</span><div class="si">${d ? `Runde ${d.round} · ${FACTIONS[d.players[0].faction].name} · ${d.players[0].score}:${d.players[1].score}` : 'Leer'}</div><div class="sb">${game && !window.__sb?.ctrl?.busy && game.current.id === 0 ? `<button data-save="${k}">Speichern</button>` : ''}${d && !game ? `<button class="primary" data-load="${k}">Laden</button>` : ''}${d ? `<button data-del="${k}">✕</button>` : ''}</div></div>`;
  }
  if (game) html += `<div class="row"><button id="gm-help">Anleitung</button><button id="gm-quit">Hauptmenü</button><button id="gm-back" class="primary">Weiter</button></div>`;
  el.innerHTML = html + '</div>';
  el.classList.add('show');
  const close = () => el.classList.remove('show');
  el.querySelector('.close').onclick = close;
  el.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => { try { localStorage.setItem(SLOT(b.dataset.save), game.serialize()); b.textContent = 'Gespeichert ✓'; } catch { b.textContent = 'Fehler'; } setTimeout(() => showSlots(game), 700); });
  el.querySelectorAll('[data-load]').forEach((b) => b.onclick = () => { const d = b.dataset.load === 'auto' ? auto : readSave(SLOT(b.dataset.load)); if (d) { close(); start(d); } });
  el.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { localStorage.removeItem(SLOT(b.dataset.del)); showSlots(game); });
  if (game) {
    el.querySelector('#gm-back').onclick = close;
    el.querySelector('#gm-help').onclick = () => { close(); $('#help').classList.add('show'); };
    el.querySelector('#gm-quit').onclick = () => location.reload();
  }
}
$('#start').onclick = showSetup;
$('#loadbtn').onclick = () => showSlots(null);
$('#mhelp').onclick = () => $('#help').classList.add('show');
$('#help .close').onclick = () => $('#help').classList.remove('show');

function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 1e6; }

async function start(save) {
  $('#menu .loading').classList.add('show');
  await new Promise((r) => setTimeout(r, 40));
  let game, map;
  if (save) {
    map = generateMap(save.seed, save.W, save.H);
    game = Game.restore(map, save);
  } else {
    const seed = opts.seed ? (parseInt(opts.seed, 10) || hash(opts.seed)) : Math.floor(Math.random() * 1e6);
    const [W, H] = MAPS[opts.map] || MAPS.mittel;
    map = generateMap(seed, W, H);
    game = new Game(map, { faction: opts.faction, target: TARGETS[opts.target] || 40, diff: DIFFICULTY[opts.diff] || DIFFICULTY.normal });
    game.settings = { ...opts };
    game.setup();
    game.events.length = 0;
  }
  const renderer = new Renderer($('#game'), game);
  const ctrl = new Controller(game, renderer, {
    save: () => { try { localStorage.setItem(AUTO, game.serialize()); } catch {} },
    clearSave: () => { try { localStorage.removeItem(AUTO); } catch {} },
    menu: () => showSlots(game),
  });
  window.__sb = { game, renderer, ctrl };
  const home = game.fac(0) === 'siedler' ? map.colony : map.lz;
  const mid = game.sites[0];
  const hp = center(home.c, home.r), mp = center(mid.c, mid.r);
  renderer.cam.z = window.innerWidth < 700 ? 0.72 : 1;
  renderer.centerOn(hp.x + (mp.x - hp.x) * 0.25, hp.y + (mp.y - hp.y) * 0.25, false);
  $('#menu').classList.add('hide');
  setTimeout(() => { menuAnim = false; }, 600);
  $('#seedinfo').textContent = `${map.name} · Karte ${map.seed}`;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    ctrl.update(dt); renderer.draw(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  ctrl.refresh();
  if (!save) {
    ctrl.hooks.save();
    const f = game.fac(0);
    ctrl.logMsg(f === 'siedler' ? 'Haltet die Kolonie. Der Techniker baut aus, die Zentrale bildet Trupps aus.' : 'Gelandet. Nachschub: ⌂ oder Landefeld antippen. Pionier: FOB nahe einem Schlüsselort errichten.', 'info');
    ctrl.logMsg('Grüne Signale = Bewegung auf dem Melder. Was es ist, zeigt erst Licht oder Nähe.', 'warn');
    await ctrl.playIntro();
    await ctrl.banner(map.name, `${game.players[0].name} gegen ${game.players[1].name} · Ziel ${game.target}`, 1.8);
    if (game.objOffer.length) ctrl.showObjective(true);
  } else await ctrl.banner(`Runde ${game.round}`, 'Gefecht fortgesetzt', 1.2);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
