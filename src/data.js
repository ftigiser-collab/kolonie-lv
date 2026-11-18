// Spieldaten: Fraktionen, Gelände, Einheiten, Bauten, Schlüsselorte, Brut
export const FACTIONS = {
  siedler: {
    name: 'Freie Siedler', short: 'Siedler', color: '#f0a640', dark: '#4a2c0c', money: 'Vorräte',
    desc: 'Rebellische Kolonisten mit fester Basis. Sie haben die Kolonie gebaut und kennen jeden Schacht.',
    perk: 'Schachtnetz von Beginn an bekannt · keine Munitionssorgen · Krankenstation entfernt Befall · Basis wächst mit dem Techniker',
  },
  marines: {
    name: 'Kolonialmarines', short: 'Marines', color: '#72b6f0', dark: '#10304e', money: 'Nachschub',
    desc: 'Eingreiftruppe aus dem Orbit, geschickt, um den Aufstand niederzuschlagen. Landungsschiffe statt Basis.',
    perk: 'Jeder Trupp mit Kurzstrecken-Melder · Nachschub landet an Landungsschiffen und FOBs · Munition begrenzt',
  },
  brut: { name: 'Die Brut', short: 'Brut', color: '#a98cff', dark: '#1a1030', money: 'Biomasse', desc: 'Gegen alle.' },
};
export const HUMANS = ['siedler', 'marines'];

export const TERRAIN = {
  dust:  { name: 'Staubebene', mv: 1, veh: 1, cover: 0, sight: 0, col: '#4b4440' },
  rock:  { name: 'Geröll', mv: 2, veh: 2, cover: 0.2, sight: 0, col: '#3d3836' },
  ridge: { name: 'Felsgrat', mv: 3, veh: null, cover: 0.4, sight: 1, col: '#2c2a2b' },
  chasm: { name: 'Spalte', mv: null, veh: null, cover: 0, sight: 0, col: '#09080a' },
  deck:  { name: 'Koloniedeck', mv: 1, veh: 1, cover: 0.1, sight: 0, col: '#4c5258' },
  road:  { name: 'Fahrweg', mv: 1, veh: 0.5, cover: 0, sight: 0, col: '#57504a' },
  wreck: { name: 'Wrack', mv: 2, veh: null, cover: 0.35, sight: 0, col: '#2a2630' },
  pad:   { name: 'Landefeld', mv: 1, veh: 1, cover: 0, sight: 0, col: '#4a5048' },
};

// cls: inf | veh | air | xeno | egg
// rng: [min, max] · armor: Schadensminderung · tracker: Melderreichweite · ammo: nur Marines
export const UNITS = {
  // ---- Freie Siedler ----
  miliz:      { fac: 'siedler', name: 'Miliz', cls: 'inf', hp: 12, atk: 5, rng: [1, 2], mv: 4, sight: 3, cost: 150, desc: 'Kolonisten mit Bergbaugewehren. Billig, zahlreich, kennen das Gelände.' },
  spaeher:    { fac: 'siedler', name: 'Späher', cls: 'inf', hp: 9, atk: 3, rng: [1, 2], mv: 5, sight: 4, tracker: 6, flares: 2, cost: 190, desc: 'Mit Bewegungsmelder und Leuchtpistole. Die Augen der Kolonie.' },
  techniker:  { fac: 'siedler', name: 'Techniker', cls: 'inf', hp: 9, atk: 2, rng: [1, 1], mv: 4, sight: 3, cost: 170, abil: ['build', 'weld', 'repair', 'charge'], desc: 'Baut die Kolonie aus, verschweißt Schächte, lädt Geschütze nach, repariert und legt Sprengladungen.' },
  brenner:    { fac: 'siedler', name: 'Brenner', cls: 'inf', hp: 11, atk: 6, rng: [1, 1], mv: 4, sight: 3, cost: 240, vs: { xeno: 1.6, egg: 2 }, abil: ['burn'], desc: 'Flammenwerfer aus dem Bergbau. Stark gegen die Brut, brennt Harz und Eier weg.' },
  werfer:     { fac: 'siedler', name: 'Werfer', cls: 'inf', hp: 9, atk: 7, rng: [2, 3], mv: 3, sight: 3, cost: 260, vs: { veh: 1.4, air: 1.5, xeno: 0.8 }, aa: true, desc: 'Improvisierte Raketenwerfer. Holt Landungsschiffe vom Himmel.' },
  lademech:   { fac: 'siedler', name: 'Lademech', cls: 'veh', hp: 26, atk: 8, rng: [1, 1], mv: 3, sight: 3, armor: 0.35, cost: 420, vs: { xeno: 1.3 }, needs: 'werkstatt', desc: 'Bergbau-Exoskelett. Langsam, aber was es packt, lässt es nicht mehr los.' },
  schlepper:  { fac: 'siedler', name: 'Raupenschlepper', cls: 'veh', hp: 26, atk: 3, rng: [1, 1], mv: 6, sight: 3, armor: 0.35, cap: 3, tracker: 5, cost: 380, needs: 'werkstatt', desc: 'Gepanzerter Kolonietransporter für 3 Trupps, mit Melder.' },
  // ---- Kolonialmarines ----
  schuetze:   { fac: 'marines', name: 'Schütze', cls: 'inf', hp: 12, atk: 5, rng: [1, 2], mv: 4, sight: 3, tracker: 3, ammo: 6, cost: 220, desc: 'Marine mit Pulsgewehr. Stark, aber die Munition ist endlich.' },
  unteroff:   { fac: 'marines', name: 'Unteroffizier', cls: 'inf', hp: 12, atk: 4, rng: [1, 2], mv: 4, sight: 3, tracker: 7, ammo: 6, flares: 2, cost: 260, abil: ['orbital'], desc: 'Trägt den großen Bewegungsmelder und Leuchtfackeln, fordert Orbitalschläge an.' },
  smartgun:   { fac: 'marines', name: 'Smartgunner', cls: 'inf', hp: 12, atk: 6, rng: [1, 3], mv: 3, sight: 3, tracker: 3, ammo: 5, armor: 0.1, cost: 360, vs: { xeno: 1.2 }, abil: ['watch'], desc: 'Zielgestütztes schweres MG. Feuert in der gegnerischen Runde auf alles, was in Reichweite zieht.' },
  pionier:    { fac: 'marines', name: 'Pionier', cls: 'inf', hp: 12, atk: 4, rng: [1, 1], mv: 4, sight: 3, tracker: 3, ammo: 5, cost: 240, abil: ['build', 'weld', 'repair', 'fob'], desc: 'Errichtet FOBs, Geschütze und Flutlichter, verschweißt Schächte.' },
  sani:       { fac: 'marines', name: 'Sanitäter', cls: 'inf', hp: 11, atk: 3, rng: [1, 2], mv: 4, sight: 3, tracker: 3, ammo: 4, cost: 200, abil: ['heal'], desc: 'Heilt Trupps daneben und stabilisiert Befallene (+1 Runde).' },
  panzerwagen:{ fac: 'marines', name: 'Panzerwagen', cls: 'veh', hp: 34, atk: 6, rng: [1, 2], mv: 6, sight: 3, armor: 0.4, cap: 4, tracker: 6, ammo: 8, cost: 600, vs: { xeno: 1.1 }, desc: 'Sechsrädriger Schützenpanzer für 4 Trupps, mit Melder.' },
  schiff:     { fac: 'marines', name: 'Landungsschiff', cls: 'air', hp: 40, atk: 7, rng: [1, 2], mv: 10, sight: 4, armor: 0.35, cap: 6, tracker: 7, ammo: 6, cost: 1500, desc: 'Fliegt über alles. Nur gelandet nimmt es auf, setzt ab und dient als Nachschubpunkt — dann ist es verwundbar.' },
  // ---- Beide Seiten ----
  synth:      { fac: 'both', name: 'Synthetiker', cls: 'inf', hp: 16, atk: 4, rng: [1, 2], mv: 5, sight: 4, tracker: 5, cost: 450, synth: true, abil: ['repair'], desc: 'Künstlicher Mensch: immun gegen Befall, sieht die Brut im Dunkeln auf 3 Felder. Ob er wirklich euch gehorcht, zeigt erst ein Scan.' },
  // ---- Brut ----
  ei:         { fac: 'brut', name: 'Ei', cls: 'egg', hp: 4, atk: 0, rng: [0, 0], mv: 0, sight: 2, desc: 'Öffnet sich, wenn Beute in die Nähe kommt.' },
  klammerer:  { fac: 'brut', name: 'Klammerer', cls: 'xeno', hp: 3, atk: 0, rng: [1, 1], mv: 5, sight: 3, vent: 3, desc: 'Springt Trupps an. Wer befallen ist, hat drei Runden.' },
  brutling:   { fac: 'brut', name: 'Brutling', cls: 'xeno', hp: 4, atk: 1, rng: [1, 1], mv: 4, sight: 2, vent: 3, desc: 'Frisch geschlüpft. Flieht in die Schächte und wächst heran.' },
  laeufer:    { fac: 'brut', name: 'Läufer', cls: 'xeno', hp: 10, atk: 4, rng: [1, 1], mv: 6, sight: 3, vent: 3, desc: 'Schnell und vierbeinig. Kommt aus den Schächten.' },
  jaeger:     { fac: 'brut', name: 'Jäger', cls: 'xeno', hp: 15, atk: 6, rng: [1, 1], mv: 5, sight: 3, armor: 0.1, vent: 2, desc: 'Der klassische Krieger der Brut. Bricht verschweißte Schächte auf.' },
  brecher:    { fac: 'brut', name: 'Brecher', cls: 'xeno', hp: 32, atk: 9, rng: [1, 1], mv: 4, sight: 3, armor: 0.3, vent: 0, desc: 'Gepanzerter Wächter. Zu groß für die Schächte.' },
  mutter:     { fac: 'brut', name: 'Mutter', cls: 'xeno', hp: 70, atk: 12, rng: [1, 1], mv: 3, sight: 4, armor: 0.35, vent: 0, desc: 'Legt Eier. Fällt sie, bricht der Befall ein.' },
};

export const BUILDINGS = {
  zentrale:   { fac: 'siedler', name: 'Kolonie-Zentrale', hp: 60, armor: 0.3, sight: 4, tracker: 6, light: 2, income: 140, recruit: ['miliz', 'spaeher', 'techniker', 'brenner', 'werfer', 'synth'], desc: 'Herz der Kolonie. Fällt sie, ist der Aufstand vorbei.' },
  wohnmodul:  { fac: 'siedler', name: 'Wohnmodul', hp: 24, armor: 0.2, sight: 2, income: 40, cost: 200, build: 1, desc: '+40 Vorräte je Runde. Die Brut spinnt die Bewohner ein.' },
  werkstatt:  { fac: 'siedler', name: 'Werkstatt', hp: 36, armor: 0.3, sight: 2, cost: 350, build: 2, recruit: ['lademech', 'schlepper'], desc: 'Baut Lademechs und Raupenschlepper.' },
  kranken:    { fac: 'siedler', name: 'Krankenstation', hp: 24, armor: 0.2, sight: 2, light: 1, cost: 250, build: 1, cure: true, desc: 'Trupps daneben werden geheilt und vom Befall befreit.' },
  geschuetz:  { fac: 'both', name: 'Wachgeschütz', hp: 16, armor: 0.25, sight: 3, tracker: 4, cost: 220, build: 1, sentry: { atk: 5, rng: 3, ammo: 8 }, desc: 'Feuert selbsttätig auf alles Fremde in 3 Feldern. Munition begrenzt, Techniker/Pionier lädt nach.' },
  flutlicht:  { fac: 'both', name: 'Flutlicht', hp: 12, armor: 0.1, sight: 3, light: 3, cost: 120, build: 1, desc: 'Leuchtet 3 Felder aus: Die Brut ist dort sofort zu erkennen. Sie hasst es.' },
  sensor:     { fac: 'both', name: 'Sensormast', hp: 12, armor: 0.1, sight: 2, tracker: 8, cost: 160, build: 1, desc: 'Großer Bewegungsmelder, 8 Felder.' },
  schott:     { fac: 'both', name: 'Barrikade', hp: 26, armor: 0.35, sight: 1, cost: 60, build: 0, desc: 'Sperrt das Feld. Hält auch die Brut eine Weile auf.' },
  fob:        { fac: 'marines', name: 'FOB', hp: 40, armor: 0.3, sight: 4, tracker: 6, light: 2, cost: 450, build: 0, spawn: 3, desc: 'Vorgeschobene Basis: Nachschub landet hier, Munition wird aufgefüllt, Bauen im Umkreis von 2.' },
  sanizelt:   { fac: 'marines', name: 'Sanitätszelt', hp: 18, armor: 0.15, sight: 2, light: 1, cost: 200, build: 1, cure: true, desc: 'Trupps daneben werden geheilt und vom Befall befreit.' },
};
export const BUILD_LIST = {
  siedler: ['wohnmodul', 'werkstatt', 'kranken', 'geschuetz', 'flutlicht', 'sensor', 'schott'],
  marines: ['geschuetz', 'flutlicht', 'sanizelt', 'sensor', 'schott'],
};
export const MARINE_BUY = ['schuetze', 'unteroff', 'smartgun', 'pionier', 'sani', 'panzerwagen', 'synth', 'schiff'];

export const SITES = {
  prozessor: { name: 'Atmosphäreprozessor', pts: 2, income: 40, desc: 'Herz des Terraformings. 2 Punkte je Runde, solange besetzt.' },
  funkmast:  { name: 'Funkmast', pts: 1, income: 30, tracker: 9, desc: '1 Punkt je Runde, dazu Melderreichweite 9 um den Mast.' },
  labor:     { name: 'Labor', pts: 1, income: 30, desc: '1 Punkt je Runde. Hier wurde die Brut zuerst untersucht.' },
  mine:      { name: 'Erzmine', pts: 1, income: 70, desc: '1 Punkt und 70 je Runde.' },
};

export const TARGETS = { kurz: 25, normal: 40, lang: 60 };
export const START_CASH = 600;
export const BOUNTY = { xeno: 15, human: 30 };
export const HOST_TIME = 3;          // Runden bis zum Ausbruch
export const LIGHT_FLARE = { rad: 2, rounds: 2, range: 4 };

// Biomasse-Kosten der Brut, Stufe ab der verfügbar
export const BROOD = { laeufer: { b: 8, st: 1 }, jaeger: { b: 14, st: 2 }, brecher: { b: 30, st: 3 }, ei: { b: 5, st: 1 } };
export const STAGE_NAMES = ['', 'Erste Sichtungen', 'Ausbreitung', 'Brutstock', 'Die Mutter erwacht'];

export const DIFFICULTY = {
  leicht: { aiCash: 0.8, brood: 0.75, name: 'Leicht' },
  normal: { aiCash: 1, brood: 1, name: 'Normal' },
  schwer: { aiCash: 1.25, brood: 1.3, name: 'Schwer' },
};

// Geheime Ziele: je Seite eines, nur für die eigene Seite sichtbar
export const OBJECTIVES = {
  wirt:       { fac: 'marines', name: 'Sonderorder: Exemplar bergen', pts: 10, desc: 'Der Konzern will die Brut lebend. Bringt einen befallenen Trupp in ein Landungsschiff und landet es auf dem Landefeld — am Rundenende muss der Wirt noch leben.' },
  zerschlagen:{ fac: 'marines', name: 'Aufstand zerschlagen', pts: 8, ai: true, desc: 'Zerstört 4 Bauten der Siedler.' },
  minen:      { fac: 'marines', name: 'Erzvorkommen sichern', pts: 8, ai: true, desc: 'Haltet am Rundenende beide Erzminen gleichzeitig.' },
  funk:       { fac: 'siedler', name: 'Funkspruch absetzen', pts: 8, ai: true, desc: 'Haltet den Funkmast 3 Runden in Folge besetzt. Die anderen Kolonien sollen erfahren, was hier geschieht.' },
  versiegeln: { fac: 'siedler', name: 'Schächte versiegeln', pts: 8, desc: 'Habt 5 Schächte gleichzeitig verschweißt.' },
  abschuss:   { fac: 'siedler', name: 'Landungsschiff abschießen', pts: 10, ai: true, desc: 'Holt ein Landungsschiff der Marines vom Himmel oder zerstört es am Boden.' },
  ausbrennen: { fac: 'siedler', name: 'Brutstätten ausbrennen', pts: 8, ai: true, desc: 'Brennt 10 Harzfelder ab oder zerstört 6 Eier.' },
  labor:      { fac: 'both', name: 'Labordaten sichern', pts: 8, ai: true, desc: 'Haltet das Labor 3 Runden in Folge besetzt.' },
  jagd:       { fac: 'both', name: 'Brut eindämmen', pts: 8, ai: true, desc: 'Tötet 12 Brutwesen (Eier zählen nicht).' },
  mutter:     { fac: 'both', name: 'Die Mutter töten', pts: 14, desc: 'Erst ab Befall-Stufe 4 erwacht sie im Wrack. Wer sie tötet, erfüllt dieses Ziel.' },
};
export const SLEEPER_CHANCE = 0.3;     // Anteil der Synthetiker mit Konzernbefehl
export const ORBITAL = { cost: 800, range: 6, rad: 1, dmg: 14, bld: 20, cooldown: 5 };
export const CHARGE = { cost: 150, rad: 1, dmg: 10, bld: 14 };
export const CORE = { start: 10, cool: 3, max: 10, trigger: 55, safe: 40 };
