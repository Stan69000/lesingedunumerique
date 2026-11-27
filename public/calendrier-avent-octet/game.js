const $ = (id) => document.getElementById(id);
const ASSET_PREFIX = document.querySelector('meta[name="asset-prefix"]')?.content ?? '';
const asset = (path) => ASSET_PREFIX + path;
// Version publique (lesingedunumerique.fr) : vraie date de Paris, pas d’outils de test,
// voix lues dans l’admin pour pouvoir en ajouter sans redéployer le site.
const SITE = document.querySelector('meta[name="avent-mode"]')?.content === 'site';
const VOICE_BASE = document.querySelector('meta[name="voice-base"]')?.content || asset('voix/');
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((kid) => kid != null && kid !== false));
  return el;
}
function icon(id, cls) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (cls) svg.setAttribute('class', cls);
  const ref = document.createElementNS(NS, 'use');
  ref.setAttribute('href', '#' + id);
  svg.append(ref);
  return svg;
}

const YEAR = 2026;
const PLAYABLE = Array.from({ length: 24 }, (_, i) => i + 1);
const LETTERS = { 6: 'C', 13: 'O', 20: 'D', 23: 'E' };
const ORNAMENTS = ['#c8352e', '#f2b632', '#1d64b3', '#1f7a55', '#e8590c', '#7c3aad'];
const CHAPTERS = [
  { n: 1, title: 'Les préparatifs', to: 6 },
  { n: 2, title: 'Les messages d’hier et d’aujourd’hui', to: 13 },
  { n: 3, title: 'Les écrans qui décident', to: 20 },
  { n: 4, title: 'La veillée', to: 24 },
];
const TITLES = {
  1: 'Le bon bouton', 2: 'Le ton des messages', 3: 'La disquette mystère', 4: 'Le message déformé',
  5: 'Les phrases secrètes', 6: 'Le message codé', 7: 'Le faux SMS du colis', 8: 'Le voyage d’Internet',
  9: 'Le bon cadrage', 10: 'Le cadeau dans le jeu', 11: 'Le robot à l’aveugle', 12: 'Publier ou recadrer ?',
  13: 'Le bruit d’Internet', 14: 'Les vidéos qui s’enchaînent', 15: 'La vieille info', 16: 'Le détour du GPS',
  17: 'Le téléphone perdu', 18: 'L’IA et la consigne', 19: 'Les sous-titres', 20: 'Le message d’erreur',
  21: 'Un objet, trois générations', 22: 'Le tome de Noël', 23: 'Le cherche-et-trouve', 24: 'Le coffre de Noël',
};
const PEOPLE = {
  octet: { name: 'Octet', art: 'p-octet' },
  bug: { name: 'Le Bug', icon: 'bug' },
  maya: { name: 'Maya', art: 'p-maya' },
  nino: { name: 'Nino', art: 'p-nino' },
  sam: { name: 'Sam', art: 'p-sam' },
  mamie: { name: 'Mamie Lou', initial: 'L' },
};
const weekday = (day) => new Date(YEAR, 11, day).toLocaleDateString('fr-FR', { weekday: 'long' });
const chapterOf = (day) => CHAPTERS.find((c) => day <= c.to);
const plural = (n, word) => n + ' ' + word + (n > 1 ? 's' : '');

function read(storageKey, fallback) {
  try { return JSON.parse(localStorage.getItem(storageKey)) ?? fallback; } catch { return fallback; }
}
function write(storageKey, value) {
  try { localStorage.setItem(storageKey, JSON.stringify(value)); return true; } catch { return false; }
}

const KEY = SITE ? 'octet-avent-2026' : 'octet-avent-2026-sandbox-v2';
const STATS_KEY = KEY + '-stats';
const PREFS_KEY = 'octet-avent-prefs';
const isDay = (d) => Number.isInteger(d) && d >= 1 && d <= 24;
const valid = (v) => ({
  day: isDay(v?.day) ? v.day : 1,
  done: [...new Set((Array.isArray(v?.done) ? v.done : []).filter(isDay))].sort((a, b) => a - b),
});
let state = valid(read(KEY, {}));
let warned = false;
function save() {
  if (!write(KEY, state) && !warned) {
    warned = true;
    toast('Ce navigateur bloque la sauvegarde. Utilise « Continuer sur un autre appareil » pour garder ta partie.');
  }
}

const restored = new URLSearchParams(location.hash.slice(1)).get('reprise');
if (restored) {
  const match = /^(\d{1,2})-([\d.]*)$/.exec(restored);
  if (match) {
    const imported = valid({ day: Number(match[1]), done: match[2].split('.').filter(Boolean).map(Number) });
    state = valid({ day: Math.max(state.day, imported.day), done: [...state.done, ...imported.done] });
    save();
  }
  history.replaceState(null, '', location.pathname + location.search);
}

/** Fenêtre du jour à Paris : 0 avant le 1er décembre à 7 h, 24 à partir du 24. */
function parisDay(at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(at).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  if (p.year > YEAR) return 24;
  if (p.year < YEAR || p.month < 12) return 0;
  return Math.min(24, p.day - (p.hour < 7 ? 1 : 0));
}
if (SITE) state.day = parisDay();

const prefs = { sound: false, big: false, test: false, ...read(PREFS_KEY, {}) };
if (SITE) prefs.test = false;
else if (new URLSearchParams(location.search).has('test')) prefs.test = true;
const stats = read(STATS_KEY, {});
const STAT_LABELS = {
  visits: 'Visites', starts: 'Parties commencées', resumes: 'Reprises', facebook: 'Arrivées Facebook simulées',
  instagram: 'Arrivées Instagram simulées', open1: 'Case 1 · ouvertures', done1: 'Case 1 · validations',
  open13: 'Case 13 · ouvertures', done13: 'Case 13 · validations', open24: 'Case 24 · ouvertures',
  done24: 'Énigmes résolues', giveups: 'Réponses dévoilées', diplomas: 'Diplômes préparés',
  print: 'Impressions ou PDF',
  carnet: 'Carnets imprimés',
  game: 'Grands jeux ouverts', agenda: 'Rappels ajoutés à l’agenda', links: 'Liens de reprise copiés',
};
function count(event) {
  stats[event] = (stats[event] ?? 0) + 1;
  write(STATS_KEY, stats);
  renderStats();
}
function renderStats() {
  $('stats').replaceChildren(...Object.entries(STAT_LABELS).flatMap(([k, label]) => [h('dt', { text: label }), h('dd', { text: String(stats[k] ?? 0) })]));
}
let started = state.done.length > 0;
count('visits');
if (restored || started) count('resumes');

let toastTimer;
function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('on'), 5000);
}

let ctx, master, analyser, bus;
function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser).connect(ctx.destination);
  }
  ctx.resume();
  return ctx;
}
function newBus() {
  stopSounds();
  bus = ctx.createGain();
  bus.connect(master);
  return bus;
}
function stopSounds() {
  if (!bus) return;
  const old = bus;
  old.gain.setTargetAtTime(0, ctx.currentTime, .02);
  setTimeout(() => old.disconnect(), 200);
  bus = undefined;
}
function tone(out, freq, start, dur, { type = 'sine', vol = .05, decay = false } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + .01);
  if (decay) gain.gain.exponentialRampToValueAtTime(.0005, start + dur);
  else {
    gain.gain.setValueAtTime(vol, start + dur - .02);
    gain.gain.linearRampToValueAtTime(0, start + dur);
  }
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + dur + .02);
  return osc;
}
function noise(out, start, dur, { vol = .05, freq = 1800, q = .7 } = {}) {
  const length = Math.ceil(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.setValueAtTime(vol, start + dur - .05);
  gain.gain.linearRampToValueAtTime(0, start + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(start);
  src.stop(start + dur);
}
const SOUNDS = {
  ring(out, t) {
    for (let r = 0; r < 2; r++) {
      const osc = tone(out, 1000, t + r * 1.5, 1, { type: 'square', vol: .018 });
      for (let s = 0; s < 50; s++) osc.frequency.setValueAtTime(s % 2 ? 1250 : 1000, t + r * 1.5 + s * .02);
    }
    return 2.6;
  },
  modem(out, t) {
    let at = t;
    tone(out, 440, at, .7, { vol: .045 });
    at += .85;
    const pad = { 0: [941, 1336], 4: [770, 1209], 7: [852, 1209], 2: [697, 1336], 1: [697, 1209], 5: [770, 1336] };
    for (const digit of [0, 4, 7, 2, 1, 5, 0]) {
      for (const f of pad[digit]) tone(out, f, at, .09, { vol: .03 });
      at += .15;
    }
    at += .35;
    tone(out, 2100, at, .9, { vol: .035 });
    at += .95;
    const steps = [1200, 2400, 1650, 1850, 980, 2250, 1300];
    for (let i = 0; i < 22; i++) tone(out, steps[(i * 5 + 3) % steps.length], at + i * .045, .05, { type: 'triangle', vol: .03 });
    noise(out, at, 1, { vol: .02, freq: 1200 });
    at += 1;
    noise(out, at, 1.5, { vol: .11, freq: 1900, q: .5 });
    const sweep = tone(out, 600, at, 1.5, { type: 'sawtooth', vol: .012 });
    sweep.frequency.linearRampToValueAtTime(2600, at + 1.5);
    return at + 1.5 - t;
  },
  notif(out, t) {
    tone(out, 880, t, .6, { vol: .09, decay: true });
    tone(out, 1318.5, t + .18, .8, { vol: .08, decay: true });
    return 1.1;
  },
};
const SFX = {
  open: [[784, 0], [988, .1], [1175, .2], [1568, .3]],
  win: [[523, 0], [659, .12], [784, .24], [1047, .36]],
  pop: [[1568, 0], [2093, .08]],
  ko: [[294, 0], [262, .14]],
};
function sfx(name) {
  if (!prefs.sound) return;
  try {
    audio();
    for (const [f, delay] of SFX[name]) tone(master, f, ctx.currentTime + delay, .35, { vol: .04, decay: true });
  } catch {}
}
function drawScope(canvas, until) {
  const g = canvas.getContext('2d');
  const ratio = devicePixelRatio || 1;
  const w = canvas.width = canvas.clientWidth * ratio;
  const hgt = canvas.height = canvas.clientHeight * ratio;
  const data = new Uint8Array(analyser.fftSize);
  const frame = () => {
    analyser.getByteTimeDomainData(data);
    g.fillStyle = '#0a1a12';
    g.fillRect(0, 0, w, hgt);
    g.strokeStyle = 'rgba(93, 255, 155, .18)';
    g.lineWidth = ratio;
    for (let x = 0; x < w; x += 24 * ratio) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hgt); g.stroke(); }
    g.strokeStyle = '#5dff9b';
    g.lineWidth = 2 * ratio;
    g.beginPath();
    for (let i = 0; i < data.length; i++) {
      const y = hgt / 2 + Math.max(-1, Math.min(1, (data[i] - 128) / 128 * 7)) * hgt * .45;
      const x = i / (data.length - 1) * w;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    if (canvas.isConnected && ctx.currentTime < until + .1) requestAnimationFrame(frame);
  };
  frame();
}

const VOICES = new Set();
fetch(VOICE_BASE + 'manifest.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((list) => {
  for (const k of list) VOICES.add(k);
  document.querySelectorAll('[data-voice]').forEach((b) => { b.hidden = !VOICES.has(b.dataset.voice); });
  if (VOICES.size) renderCalendar();
}).catch(() => {});
let popBus;
function stopPops() {
  if (!popBus) return;
  const old = popBus;
  old.gain.setTargetAtTime(0, ctx.currentTime, .01);
  setTimeout(() => old.disconnect(), 150);
  popBus = undefined;
}
// Un petit son par bulle, calé sur leur apparition (voir animation-delay dans stage).
function bubblePops(lines) {
  if (!prefs.sound) return;
  try {
    audio();
    popBus = ctx.createGain();
    popBus.connect(master);
    lines.forEach(([who], i) => {
      if (reduced.matches && i) return;
      const t = ctx.currentTime + (reduced.matches ? 0 : .9 + i * .7);
      if (who === 'bug') {
        tone(popBus, 196, t, .07, { type: 'square', vol: .016 });
        tone(popBus, 147, t + .09, .09, { type: 'square', vol: .016 });
      } else {
        const f = who === 'octet' ? 1047 : 784;
        tone(popBus, f, t, .18, { vol: .035, decay: true });
        tone(popBus, f * 1.5, t + .06, .22, { vol: .03, decay: true });
      }
    });
  } catch {}
}
let voice;
function stopVoice() {
  stopPops();
  if (!voice) return;
  voice.stopped = true;
  voice.audio?.pause();
  voice.list?.querySelectorAll('.speaking').forEach((li) => li.classList.remove('speaking'));
  if (voice.btn) voice.btn.textContent = 'Écouter la scène';
  voice = undefined;
}
function playLine(file, who) {
  const audio = new Audio(VOICE_BASE + file);
  if (who === 'bug') { audio.preservesPitch = false; audio.playbackRate = 1.08; }
  return audio;
}
function playScene(lines, prefix, list, btn) {
  if (voice?.btn === btn) { stopVoice(); return; }
  stopVoice();
  const me = { list, btn, stopped: false };
  if (current) current.listened = true;
  voice = me;
  btn.textContent = 'Arrêter';
  const items = list.querySelectorAll('.bubble');
  const next = (i) => {
    items.forEach((li) => li.classList.remove('speaking'));
    if (me.stopped) return;
    if (i >= lines.length) { stopVoice(); return; }
    const [who] = lines[i];
    items[i]?.classList.add('speaking');
    me.audio = playLine(prefix + (i + 1) + '-' + who + '.m4a', who);
    me.audio.addEventListener('ended', () => setTimeout(() => next(i + 1), 350));
    me.audio.addEventListener('error', () => next(i + 1));
    me.audio.play().catch(() => next(i + 1));
  };
  next(0);
}

function avatar(who) {
  const p = PEOPLE[who];
  return h('span', { class: 'avatar avatar-' + who, 'aria-hidden': 'true' }, p.art ? h('span', { class: 'art art-' + p.art }) : p.icon ? icon(p.icon) : p.initial);
}
function octetFigure(cls) {
  const fig = h('div', { class: 'octet-fig ' + cls, 'aria-hidden': 'true' }, h('span', { class: 'art art-pointe' }));
  fig.append(icon('hat', 'hat'), icon('bug', 'stage-bug'));
  return fig;
}
function stage(lines, prefix) {
  const list = h('ol', { class: 'bubbles' }, lines.map(([who, text], i) => h('li', { class: 'bubble ' + who, style: reduced.matches ? '' : `animation-delay:${.9 + i * .7}s` },
    avatar(who), h('div', {}, h('strong', { text: PEOPLE[who].name }), text))));
  const btn = h('button', { type: 'button', class: 'secondary read-aloud', 'data-voice': prefix || '', hidden: !(prefix && VOICES.has(prefix)), onclick: (e) => playScene(lines, prefix, list, e.currentTarget) }, 'Écouter la scène');
  bubblePops(lines);
  return h('div', {}, h('div', { class: 'stage' }, list, octetFigure('stage-chars')), btn);
}
const pad = (n) => String(n).padStart(2, '0');
/** « Pour les grands » ne paraît sur le site qu’une fois ses faits vérifiés. */
const verified = (def) => !/vérifier|à choisir/i.test(def.source ?? '');
function answer(def) {
  const letter = LETTERS[current.day];
  return h('div', { class: 'answer' },
    letter && h('div', { class: 'letter-found' }, h('b', { text: letter }), h('p', {}, h('strong', { text: 'Tu as trouvé une lettre ! ' }), def.letterText)),
    def.extra?.(),
    h('section', { class: 'reflex' }, h('span', { class: 'art art-pouce', 'aria-hidden': 'true' }), h('h3', { text: def.reflexTitle ?? 'Le réflexe d’Octet' }), h('p', { text: def.reflex })),
    h('section', { class: 'family' }, h('h3', { text: 'À discuter en famille' }), h('p', { text: def.family })),
    SITE
      ? verified(def) && h('details', { class: 'grown' }, h('summary', { text: 'Pour les grands' }), def.grown.map((t) => h('p', { text: t })))
      : h('details', { class: 'grown' }, h('summary', { text: 'Pour les grands' }),
        def.grown.map((t) => h('p', { text: t })),
        h('p', { class: 'source' }, h('span', { class: 'draft', text: 'Brouillon' }), ' ', def.source)));
}
function feedbackBox() {
  return h('p', { class: 'feedback', role: 'status' });
}
function say(box, ok, text) {
  box.className = 'feedback ' + (ok ? 'ok' : 'ko');
  box.textContent = text;
  if (!ok && !reduced.matches) {
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
  }
}
function giveUp(onReveal) {
  return h('button', { type: 'button', class: 'giveup', hidden: true, onclick: (e) => { e.target.hidden = true; count('giveups'); onReveal(); } }, 'Je donne ma langue au chat');
}

const CASES = {
  1: {
    title: TITLES[1],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['octet', 'Ce soir, on prépare la veillée de Noël ! Il me faut le grand jeu de la veillée, à imprimer pour toute la famille.'],
      ['maya', 'Je l’ai trouvé ! Mais… il y a des boutons « Télécharger » partout.'],
      ['bug', 'Hé hé ! J’en ai ajouté quelques-uns. Et ce n’est que le début…'],
      ['octet', 'Aide-moi à choisir le bon bouton, sans tomber dans le piège du Bug.'],
    ],
    challenge(done) {
      const box = feedbackBox();
      const locked = h('div', { class: 'locked-file', hidden: true },
        h('div', { class: 'locked-row' }, icon('file'), h('span', {}, h('b', { text: 'grand-jeu-veillee-octet.pdf' }), h('small', { text: 'Verrouillé · code à 4 lettres' })), h('span', { class: 'padlock', 'aria-hidden': 'true', text: '🔒' })),
        h('div', { class: 'bubble bug' }, avatar('bug'), h('div', {}, h('strong', { text: 'Le Bug' }), 'Trop tard ! J’ai enfermé le jeu dans mon coffre, avec un code de quatre lettres. Je les ai cachées dans le calendrier. Rendez-vous le 24… si tu les trouves !')));
      let misses = 0;
      const pick = (btn, ok, text) => {
        for (const b of options) b.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.toggle('right', ok);
        btn.classList.toggle('wrong', !ok);
        say(box, ok, text);
        if (ok) { locked.hidden = false; if ((prefs.sound || current?.listened) && VOICES.has('case-01-cadenas-')) { stopVoice(); const a = playLine('case-01-cadenas-bug.m4a', 'bug'); voice = { audio: a, stopped: false }; a.play().catch(() => {}); } done(); setTimeout(() => locked.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' }), 600); }
        else if (++misses >= 2) giveup.hidden = false;
      };
      const right = 'Bravo ! Ce bouton donne le nom du fichier, son format (PDF) et sa taille (1,8 Mo) : c’est le bon. Mais regarde ce qui arrive…';
      const options = [
        h('button', { type: 'button', class: 'fake fake-ad', 'aria-pressed': 'false', onclick: (e) => { sfx('ko'); pick(e.currentTarget, false, 'Pas celui-là : c’est justement le piège du Bug. En haut à droite du bouton, il est écrit « Annonce » : il mène vers une publicité, pas vers le jeu.'); } },
          h('small', { text: 'Annonce' }), 'TÉLÉCHARGER'),
        h('button', { type: 'button', class: 'fake fake-file', 'aria-pressed': 'false', onclick: (e) => { pick(e.currentTarget, true, right); } },
          icon('file'), h('span', {}, h('b', { text: 'grand-jeu-veillee-octet.pdf' }), h('small', { text: 'PDF · 1,8 Mo · 6 pages' })), h('em', { text: 'Télécharger' })),
        h('button', { type: 'button', class: 'fake fake-install', 'aria-pressed': 'false', onclick: (e) => { sfx('ko'); pick(e.currentTarget, false, 'Pas celui-là : un fichier PDF s’ouvre tout seul, sans rien installer. Un bouton « Installez… » peut ajouter un programme dont tu n’as pas besoin.'); } },
          h('span', {}, 'DÉMARRER ▶', h('small', { text: 'Installez notre lecteur pour télécharger' }))),
      ];
      const giveup = giveUp(() => pick(options[1], true, 'Le bon bouton était celui du fichier : on y lit le nom, le format (PDF) et la taille (1,8 Mo). Mais regarde ce qui arrive…'));
      return h('div', {},
        h('h3', { tabindex: '-1', text: 'Quel bouton conseilles-tu à Octet ?' }),
        h('div', { class: 'browser' },
          h('div', { class: 'browser-bar', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', { text: 'lesingedunumerique.fr/veillee' })),
          h('div', { class: 'browser-page' }, h('h3', { text: 'Le grand jeu de la veillée, à imprimer' }), h('p', { class: 'small', text: 'Un plateau, des pions et des cartes pour jouer en famille le soir de Noël.' }), ...options)),
        box, giveup, locked);
    },
    extra: () => h('section', { class: 'mission' },
      h('h3', { text: 'Ta mission' }),
      h('p', { text: 'Retrouve les quatre lettres cachées dans le calendrier pour ouvrir le coffre du Bug le 24 décembre et libérer le grand jeu. Note-les dans ton carnet d’enquête : celui de la page, ou celui à imprimer.' }),
      h('a', { class: 'btn', href: asset('carnet-enquete-octet.pdf'), target: '_blank', rel: 'noopener', onclick: () => count('carnet') }, 'Imprimer mon carnet d’enquête (PDF, 1 page)')),
    reflex: 'Avant de cliquer sur « Télécharger », je cherche le nom du fichier, son format et sa taille. Et je me méfie des mots « Annonce » et « Installer ».',
    family: 'Chez vous, a-t-on le droit de télécharger quelque chose tout seul ? À qui demande-t-on quand on hésite ?',
    grown: [
      'Les faux boutons de téléchargement sont des publicités placées à côté du vrai lien. Les plus trompeuses poussent à installer un programme inutile, parfois malveillant.',
      'Le bon réflexe : télécharger depuis le site officiel de l’éditeur, lire le nom du fichier avant de l’ouvrir, et ne jamais installer un « lecteur » pour un simple PDF.',
    ],
    source: 'Source à vérifier avant publication (piste : cybermalveillance.gouv.fr).',
  },
  13: {
    title: TITLES[13],
    kind: 'Défi sonore · casque bienvenu',
    scene: [
      ['mamie', 'Quand tes parents étaient ados, l’ordinateur chantait avant d’aller sur Internet !'],
      ['nino', 'Il chantait ? Pour de vrai ?'],
      ['bug', 'J’ai mélangé trois sons de mon grenier. Bonne chance pour trouver le bon !'],
      ['octet', 'Écoute les trois sons. Lequel faisait l’ordinateur pour se connecter à Internet par la ligne du téléphone ?'],
    ],
    challenge(done) {
      const status = h('p', { class: 'small', role: 'status' });
      const scope = h('canvas', { class: 'scope', 'aria-hidden': 'true' });
      requestAnimationFrame(() => {
        const g = scope.getContext('2d');
        scope.width = scope.clientWidth;
        scope.height = scope.clientHeight;
        g.strokeStyle = '#5dff9b';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, scope.height / 2);
        g.lineTo(scope.width, scope.height / 2);
        g.stroke();
      });
      const box = feedbackBox();
      let misses = 0;
      const players = [];
      const sound = (n, name, desc) => {
        const btn = h('button', { type: 'button', onclick: () => {
          try {
            audio();
            const out = newBus();
            const length = SOUNDS[name](out, ctx.currentTime + .05);
            for (const p of players) p.classList.remove('playing');
            btn.classList.add('playing');
            setTimeout(() => btn.classList.remove('playing'), length * 1000 + 100);
            drawScope(scope, ctx.currentTime + length);
            status.textContent = 'Lecture du son ' + n + '.';
          } catch {
            status.textContent = 'Le son est indisponible ici. Ouvre les descriptions pour jouer quand même.';
          }
        } }, 'Écouter le son ' + n);
        players.push(btn);
        return h('div', { class: 'sound' }, btn, h('details', {}, h('summary', { class: 'small', text: 'Lire la description' }), h('p', { text: desc })));
      };
      const replies = [
        [false, 'Pas celui-là : c’est la sonnerie d’un vieux téléphone. Réécoute les autres sons !'],
        [true, 'Exact ! Des bips, un long sifflement, puis un grand « kshhh » : c’était le modem qui « discutait » avec un autre modem au bout du fil.'],
        [false, 'Pas celui-là : ce petit « ding-dong », c’est une notification d’aujourd’hui. Réécoute les autres !'],
      ];
      const choices = replies.map(([ok, text], i) => h('button', { type: 'button', onclick: (e) => {
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        say(box, ok, text);
        if (ok) done();
        else { sfx('ko'); if (++misses >= 2) giveup.hidden = false; }
      } }, 'Le son ' + (i + 1)));
      const giveup = giveUp(() => { choices[1].classList.add('right'); say(box, true, 'C’était le son 2 : la connexion par modem.'); done(); });
      return h('div', {},
        h('h3', { tabindex: '-1', text: 'Écoute, puis choisis' }),
        h('div', { class: 'sounds' },
          sound(1, 'ring', 'Une sonnerie qui vibre très vite, deux fois de suite.'),
          sound(2, 'modem', 'Une tonalité, de petits bips, un sifflement aigu, puis des grésillements et un grand « kshhh ».'),
          sound(3, 'notif', 'Deux notes douces : « ding-dong ».')),
        scope, status,
        h('p', { text: 'Ces sons sont recréés pour le jeu. Lequel est le modem ?' }),
        h('div', { class: 'choices' }, choices), box, giveup);
    },
    letterText: 'O comme ONDE. Le modem transformait les informations en sons, des ondes qui voyageaient dans le fil du téléphone.',
    reflex: 'Internet n’a rien de magique : ce sont des signaux qui voyagent, par des fils, par des ondes ou par la lumière.',
    family: 'Demande à un adulte : te souviens-tu de ce bruit ? Que se passait-il si quelqu’un voulait téléphoner pendant qu’on était sur Internet ?',
    grown: [
      'Avant l’ADSL, on se connectait avec un modem branché sur la ligne téléphonique, à 56 kbit/s au mieux. Pendant la connexion, la ligne était occupée : impossible de téléphoner.',
      'Les sons servaient aux deux modems à se reconnaître et à se mettre d’accord sur la vitesse. Ceux de ce jeu sont recréés, pas enregistrés.',
    ],
    source: 'Faits à vérifier avant publication.',
  },
  24: {
    title: TITLES[24],
    kind: 'Grande énigme',
    steps: ['La scène', 'Le cadenas', 'Le coffre'],
    scene: [
      ['octet', 'C’est le soir de la veillée ! Tout est prêt… sauf le grand jeu, toujours enfermé dans le coffre du Bug.'],
      ['bug', 'Souviens-toi : il faut un code de quatre lettres ! Pendant tout le mois, j’en ai caché une dans quatre cases.'],
      ['sam', 'Ton carnet d’enquête ! Les lettres sont dedans.'],
      ['octet', 'Range les lettres dans l’ordre des cases, puis tourne les molettes du cadenas.'],
    ],
    challenge(done) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const values = [0, 0, 0, 0];
      const box = feedbackBox();
      const wheels = values.map((_, i) => {
        const face = h('div', { role: 'spinbutton', tabindex: '0', 'aria-label': 'Molette ' + (i + 1), 'aria-valuemin': '0', 'aria-valuemax': '25' });
        const set = (v) => {
          values[i] = (v + 26) % 26;
          face.textContent = alphabet[values[i]];
          face.setAttribute('aria-valuenow', String(values[i]));
          face.setAttribute('aria-valuetext', alphabet[values[i]]);
        };
        face.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowUp') set(values[i] - 1);
          else if (e.key === 'ArrowDown') set(values[i] + 1);
          else if (/^[a-z]$/i.test(e.key)) set(alphabet.indexOf(e.key.toUpperCase()));
          else return;
          e.preventDefault();
        });
        set(0);
        return h('div', { class: 'wheel' },
          h('button', { type: 'button', tabindex: '-1', 'aria-hidden': 'true', onclick: () => set(values[i] - 1) }, '▲'),
          face,
          h('button', { type: 'button', tabindex: '-1', 'aria-hidden': 'true', onclick: () => set(values[i] + 1) }, '▼'));
      });
      const lock = h('div', { class: 'lock' },
        h('div', { class: 'wheels' }, wheels),
        h('button', { type: 'button', onclick: () => {
          const word = values.map((v) => alphabet[v]).join('');
          if (word === 'CODE') {
            say(box, true, 'Clac ! Le cadenas s’ouvre.');
            done();
          } else {
            sfx('ko');
            const missing = Object.keys(LETTERS).map(Number).filter((d) => !state.done.includes(d));
            say(box, false, 'Le coffre reste fermé. Vérifie l’ordre des lettres.' + (missing.length ? ' Il te manque des lettres : rattrape ' + (missing.length > 1 ? 'les cases ' : 'la case ') + missing.join(', ') + '.' : ''));
            if (!reduced.matches) { lock.classList.remove('shake'); void lock.offsetWidth; lock.classList.add('shake'); }
          }
        } }, 'Tourner la poignée'));
      const notebook = h('p', {}, 'Ton carnet : ', Object.entries(LETTERS).map(([d, l]) => h('strong', { text: (state.done.includes(Number(d)) ? l : '?') + ' ' })));
      return h('div', {},
        h('h3', { tabindex: '-1', text: 'Le cadenas du Bug' }),
        notebook,
        lock,
        h('p', { class: 'small', text: 'Clavier : flèches haut et bas, ou tape directement une lettre.' }),
        box,
        h('details', { class: 'hints' }, h('summary', { text: 'Un indice ?' }),
          h('p', { text: 'Les lettres sont dans ton carnet d’enquête. Elles viennent des cases 6, 13, 20 et 23.' }),
          h('details', {}, h('summary', { text: 'Encore un indice' }), h('p', { text: 'Écris-les dans l’ordre des cases : celle du 6 d’abord, celle du 23 en dernier.' }))));
    },
    finale() {
      const chest = document.createElementNS(NS, 'svg');
      chest.setAttribute('viewBox', '0 0 200 170');
      chest.setAttribute('class', 'chest');
      chest.setAttribute('aria-hidden', 'true');
      chest.innerHTML = '<g class="rays"><path d="M100 90 L40 0 H70Z M100 90 L90 0 H115Z M100 90 L140 0 H165Z M100 90 L190 20 V45Z M100 90 L10 20 V45Z" fill="#ffd174" opacity=".55"/></g>'
        + '<ellipse cx="100" cy="88" rx="62" ry="10" fill="#fff4cf"/>'
        + '<rect x="30" y="84" width="140" height="70" rx="8" fill="#8a4b1f"/><rect x="30" y="98" width="140" height="8" fill="#f2b632"/>'
        + '<rect x="92" y="84" width="16" height="70" fill="#f2b632"/><rect x="88" y="90" width="24" height="20" rx="4" fill="#b8860b"/>'
        + '<g class="lid"><path d="M30 86 h140 v-22 q-70 -42 -140 0 z" fill="#a35a26"/><rect x="92" y="44" width="16" height="42" fill="#f2b632"/></g>';
      setTimeout(() => chest.classList.add('open'), 150);
      setTimeout(burst, reduced.matches ? 0 : 900);
      return h('div', { class: 'answer' },
        h('h3', { tabindex: '-1', class: 'sr-only', text: 'Le coffre est ouvert' }),
        chest,
        stage([
          ['bug', 'D’accord, d’accord… Je voulais juste qu’on joue avec moi. Et chaque fois que je semais la pagaille, tu as trouvé le bon réflexe !'],
          ['octet', 'Le grand jeu est libéré ! Mais le vrai cadeau, c’est tout ce que tu sais faire maintenant. Joyeux Noël !'],
        ], 'case-24-fin-'),
        h('section', { class: 'reflex' }, h('span', { class: 'art art-pouce', 'aria-hidden': 'true' }), h('h3', { text: 'Le code d’Octet' }),
          h('p', { text: 'C comme Calme : je fais une pause. O comme Observer. D comme Douter un peu et vérifier. E comme En parler à quelqu’un.' })),
        h('div', { class: 'gift' }, icon('holly'), h('p', {}, h('strong', { text: 'Le grand jeu de la veillée est libéré !' }), ' Un plateau, cinq pions et 48 cartes à imprimer pour jouer en famille ce soir. ', h('a', { class: 'btn secondary', href: asset('grand-jeu-veillee-octet.pdf'), target: '_blank', rel: 'noopener', onclick: () => count('game') }, 'Ouvrir le grand jeu (PDF)'))));
    },
  },
};

function art(viewBox, inner, cls = 'pic', label) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('class', cls);
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = inner;
  return svg;
}
function title(text) {
  return h('h3', { tabindex: '-1', text });
}
function quiz(done, { question, intro, options, layout = 'stack' }) {
  const box = feedbackBox();
  let misses = 0;
  let finished = false;
  const right = options.findIndex((o) => o.ok);
  const buttons = options.map((o) => h('button', { type: 'button', class: 'opt', onclick: (e) => {
    if (finished) return;
    e.currentTarget.classList.add(o.ok ? 'right' : 'wrong');
    say(box, !!o.ok, o.feedback);
    if (o.ok) { finished = true; done(); }
    else { sfx('ko'); if (++misses >= 2) giveup.hidden = false; }
  } }, o.label));
  const giveup = giveUp(() => { finished = true; buttons[right].classList.add('right'); say(box, true, options[right].feedback); done(); });
  return h('div', {}, title(question), intro, h('div', { class: 'opts opts-' + layout }, buttons), box, giveup);
}
function spot(done, { question, scene, need, foundText }) {
  const box = feedbackBox();
  const counter = h('p', { class: 'counter', 'aria-live': 'polite' });
  let found = 0;
  const update = () => { counter.textContent = 'Indices trouvés : ' + found + ' sur ' + need; };
  for (const el of scene.querySelectorAll('[data-spot]')) {
    el.addEventListener('click', () => {
      const ok = el.dataset.spot === 'ok';
      if (ok && !el.classList.contains('found')) {
        el.classList.add('found');
        found++;
        update();
        if (found === need) { say(box, true, foundText); done(); return; }
      }
      say(box, ok, el.dataset.say);
      if (!ok) sfx('ko');
    });
  }
  update();
  return h('div', {}, title(question), scene, counter, box);
}
function order(done, { question, intro, items, doneText, wrongText = 'Pas encore : qu’est-ce qui vient juste avant ?' }) {
  const box = feedbackBox();
  const list = h('ol', { class: 'order-list', 'aria-label': 'Ton ordre' });
  let next = 0;
  const shuffled = items.map((it, i) => [it, i]).sort((a, b) => (((a[1] + 1) * 3) % (items.length + 1)) - (((b[1] + 1) * 3) % (items.length + 1)));
  const pool = h('div', { class: 'order-pool' }, shuffled.map(([it, i]) => h('button', { type: 'button', class: 'opt', onclick: (e) => {
    if (i === next) {
      e.currentTarget.disabled = true;
      e.currentTarget.classList.add('placed');
      list.append(h('li', {}, it.label));
      next++;
      if (next === items.length) { say(box, true, doneText); done(); }
      else { box.className = 'feedback'; box.textContent = ''; }
    } else {
      sfx('ko');
      say(box, false, it.hint ?? wrongText);
    }
  } }, it.label)));
  return h('div', {}, title(question), intro, pool, h('p', { class: 'small', text: 'Ton ordre :' }), list, box);
}
function decode(done, { question, intro, answer, okText }) {
  const box = feedbackBox();
  const input = h('input', { 'aria-label': 'Ta réponse', maxlength: '20', autocomplete: 'off', autocapitalize: 'characters', class: 'code-input' });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const form = h('form', { class: 'inline', onsubmit: (e) => {
    e.preventDefault();
    if (norm(input.value) === norm(answer)) { say(box, true, okText); done(); }
    else { sfx('ko'); say(box, false, 'Ce n’est pas encore ça. Prends les lettres une par une.'); }
  } }, input, h('button', { text: 'Valider' }));
  return h('div', {}, title(question), intro, form, box);
}
function decoder(done, { encoded, answer, okText }) {
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const box = feedbackBox();
  const cells = ABC.split('').map((l) => h('span', { text: l }));
  const strip = h('div', { class: 'abc', 'aria-hidden': 'true' }, cells);
  const mark = (letter) => cells.forEach((c, i) => c.classList.toggle('here', ABC[i] === letter));
  const inputs = [];
  const check = () => {
    if (inputs.every((inp, i) => inp.value === answer[i])) { mark(''); say(box, true, okText); done(); }
  };
  const cols = encoded.split('').map((enc, i) => {
    const inp = h('input', { class: 'letter-in', maxlength: '1', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Lettre ' + (i + 1) + ' : ' + enc + ' recule d’un cran' });
    if (i === 0) { inp.value = answer[0]; inp.readOnly = true; inp.classList.add('ok', 'given'); }
    inp.addEventListener('focus', () => mark(enc));
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
      if (!inp.value) { inp.className = 'letter-in'; return; }
      if (inp.value === answer[i]) {
        inp.className = 'letter-in ok';
        inp.readOnly = true;
        const next = inputs.find((x) => !x.readOnly);
        if (next) { next.focus(); mark(encoded[inputs.indexOf(next)]); }
        box.className = 'feedback'; box.textContent = '';
        check();
      } else {
        inp.className = 'letter-in ko';
        say(box, false, 'Presque ! Trouve ' + enc + ' dans l’alphabet, puis prends la lettre juste avant, à sa gauche.');
      }
    });
    inputs.push(inp);
    return h('div', { class: 'dec-col' }, h('b', { text: enc }), h('span', { class: 'dec-arrow', 'aria-hidden': 'true', text: '↓ −1' }), inp);
  });
  const hint = h('button', { type: 'button', class: 'secondary', onclick: () => {
    const i = inputs.findIndex((x) => !x.readOnly);
    if (i < 0) return;
    inputs[i].value = answer[i];
    inputs[i].className = 'letter-in ok helped';
    inputs[i].readOnly = true;
    say(box, true, encoded[i] + ' recule d’un cran : ' + answer[i] + '. À toi pour la suivante !');
    check();
  } }, 'Un coup de pouce');
  return h('div', {}, title('Décode le mot secret'),
    h('p', { text: 'Octet a avancé chaque lettre d’un cran dans l’alphabet : A est devenu B, B est devenu C… Pour décoder, il suffit de reculer d’un cran.' }),
    strip,
    h('p', { class: 'example' }, h('strong', { text: 'Exemple : ' }), 'D recule d’un cran → C. La première lettre est donc C, on te l’a déjà écrite !'),
    h('div', { class: 'dec-row' }, cols),
    h('p', { class: 'small', text: 'Clique dans une case : sa lettre s’allume dans l’alphabet.' }),
    hint, box);
}
function multi(done, { question, options, okText }) {
  const box = feedbackBox();
  const checks = options.map((o) => h('input', { type: 'checkbox' }));
  const notes = options.map(() => h('span', { class: 'note' }));
  const list = h('ul', { class: 'multi' }, options.map((o, i) => h('li', {}, h('label', {}, checks[i], ' ', o.label), notes[i])));
  const btn = h('button', { type: 'button', onclick: () => {
    let errors = 0;
    options.forEach((o, i) => {
      const wrong = checks[i].checked !== !!o.ok;
      if (wrong) errors++;
      notes[i].textContent = checks[i].checked ? (o.ok ? '✓ ' : '✗ ') + o.feedback : '';
      notes[i].className = 'note ' + (o.ok ? 'ok' : 'ko');
    });
    if (!errors) { say(box, true, okText); done(); }
    else { sfx('ko'); say(box, false, errors === 1 ? 'Presque ! Une case est mal cochée : relis les explications.' : errors + ' cases sont mal cochées : relis les explications et réessaie.'); }
  } }, 'Vérifier');
  return h('div', {}, title(question), list, btn, box);
}
function together(done, { question, intro, steps, reveal, okText }) {
  const box = feedbackBox();
  return h('div', {}, title(question), intro,
    h('ol', { class: 'steps-list' }, steps.map((s) => h('li', { text: s }))),
    reveal && h('details', { class: 'hints' }, h('summary', { text: reveal.label }), reveal.content),
    h('button', { type: 'button', onclick: (e) => { e.currentTarget.disabled = true; say(box, true, okText); done(); } }, 'On l’a fait !'),
    h('p', { class: 'small', text: 'Pas le temps maintenant ? Tu peux fermer la case et y revenir plus tard.' }),
    box);
}

const DRAW = {
  floppy: '<rect x="10" y="10" width="100" height="100" rx="6" fill="#2f3b52"/><path d="M10 16 v-6 h6z" fill="#fff7e8"/><rect x="32" y="10" width="54" height="34" rx="2" fill="#c9ced8"/><rect x="66" y="16" width="12" height="22" fill="#2f3b52"/><rect x="20" y="56" width="80" height="48" rx="3" fill="#fff7e8"/><path d="M28 70h64M28 81h64M28 92h40" stroke="#9aa6bb" stroke-width="3"/><text x="60" y="66" text-anchor="middle" font-size="9" font-weight="700" fill="#c8352e">NOËL 1998</text>',
  robot: '<line x1="60" y1="6" x2="60" y2="20" stroke="#16305e" stroke-width="4"/><circle cx="60" cy="6" r="5" fill="#e8590c"/><rect x="30" y="20" width="60" height="44" rx="10" fill="#9aa6bb" stroke="#16305e" stroke-width="3"/><circle cx="47" cy="40" r="7" fill="#fff"/><circle cx="73" cy="40" r="7" fill="#fff"/><circle cx="47" cy="40" r="3" fill="#16305e"/><circle cx="73" cy="40" r="3" fill="#16305e"/><rect x="46" y="52" width="28" height="5" rx="2" fill="#16305e"/><rect x="24" y="68" width="72" height="50" rx="6" fill="#1d64b3" stroke="#16305e" stroke-width="3"/><path d="M60 80 l6 10 h-12z" fill="#f2b632"/><rect x="6" y="72" width="16" height="8" rx="4" fill="#9aa6bb"/><rect x="98" y="72" width="16" height="8" rx="4" fill="#9aa6bb"/><rect x="36" y="118" width="14" height="18" fill="#9aa6bb"/><rect x="70" y="118" width="14" height="18" fill="#9aa6bb"/>',
  dial: '<path d="M14 92 L26 50 H94 L106 92 Z" fill="#c8352e"/><path d="M8 44 q52 -36 104 0 l-10 10 q-42 -22 -84 0z" fill="#a42821"/><circle cx="60" cy="72" r="17" fill="#fff7e8"/><g fill="#a42821"><circle cx="60" cy="61" r="2.5"/><circle cx="69" cy="65" r="2.5"/><circle cx="71" cy="74" r="2.5"/><circle cx="65" cy="82" r="2.5"/><circle cx="55" cy="82" r="2.5"/><circle cx="49" cy="74" r="2.5"/><circle cx="51" cy="65" r="2.5"/></g>',
  flip: '<rect x="38" y="4" width="44" height="42" rx="7" fill="#9aa6bb"/><rect x="44" y="10" width="32" height="28" rx="2" fill="#7fd1ae"/><rect x="38" y="50" width="44" height="46" rx="7" fill="#6b7587"/><g fill="#c9ced8"><rect x="44" y="58" width="9" height="6" rx="2"/><rect x="56" y="58" width="9" height="6" rx="2"/><rect x="68" y="58" width="9" height="6" rx="2"/><rect x="44" y="68" width="9" height="6" rx="2"/><rect x="56" y="68" width="9" height="6" rx="2"/><rect x="68" y="68" width="9" height="6" rx="2"/><rect x="44" y="78" width="9" height="6" rx="2"/><rect x="56" y="78" width="9" height="6" rx="2"/><rect x="68" y="78" width="9" height="6" rx="2"/></g>',
  smart: '<rect x="36" y="2" width="48" height="96" rx="9" fill="#16305e"/><rect x="40" y="10" width="40" height="78" rx="4" fill="#5aa0e6"/><g fill="#fff" opacity=".85"><rect x="45" y="16" width="9" height="9" rx="2"/><rect x="56" y="16" width="9" height="9" rx="2"/><rect x="67" y="16" width="9" height="9" rx="2"/><rect x="45" y="28" width="9" height="9" rx="2"/><rect x="56" y="28" width="9" height="9" rx="2"/><rect x="67" y="28" width="9" height="9" rx="2"/></g>',
  room: (extra = '') => '<rect width="300" height="200" fill="#f3e3c3"/><rect y="150" width="300" height="50" fill="#c79a6b"/><rect x="18" y="30" width="70" height="60" fill="#17346a" stroke="#fff" stroke-width="5"/><circle cx="40" cy="48" r="2" fill="#fff"/><circle cx="66" cy="60" r="2" fill="#fff"/><path d="M230 40 l40 70 h-80z M230 70 l46 80 h-92z" fill="#1f6b4a"/><rect x="224" y="150" width="12" height="14" fill="#6e3d18"/><circle cx="214" cy="100" r="5" fill="#c8352e"/><circle cx="246" cy="122" r="5" fill="#f2b632"/><circle cx="222" cy="134" r="5" fill="#1d64b3"/><rect x="190" y="160" width="22" height="18" fill="#c8352e"/><rect x="246" y="164" width="18" height="14" fill="#1f7a55"/>' + extra,
  people: '<circle cx="120" cy="86" r="16" fill="#e9b98a"/><path d="M104 80 q16 -22 32 0" fill="#5a3418"/><rect x="104" y="104" width="32" height="50" rx="10" fill="#c2410c"/><circle cx="162" cy="80" r="17" fill="#e9b98a"/><path d="M145 76 q17 -20 34 0" fill="#d9d9d9"/><rect x="146" y="99" width="34" height="56" rx="10" fill="#7c3aad"/><circle cx="114" cy="84" r="2" fill="#2a1408"/><circle cx="126" cy="84" r="2" fill="#2a1408"/><circle cx="156" cy="78" r="2" fill="#2a1408"/><circle cx="168" cy="78" r="2" fill="#2a1408"/><path d="M114 92 q6 5 12 0 M156 86 q6 5 12 0" stroke="#2a1408" stroke-width="2" fill="none"/>',
  tree: ({ color, gifts, cat }) => {
    let s = `<rect width="120" height="120" fill="#fff7e8"/><path d="M60 10 l30 50 h-60z M60 34 l36 60 h-72z" fill="${color}"/><rect x="54" y="94" width="12" height="12" fill="#6e3d18"/>`;
    const xs = [14, 32, 78, 94];
    for (let i = 0; i < gifts; i++) s += `<rect x="${xs[i]}" y="96" width="14" height="14" fill="${['#c8352e', '#f2b632', '#7c3aad', '#e8590c'][i]}"/><rect x="${xs[i] + 6}" y="96" width="2" height="14" fill="#fff"/>`;
    if (cat) s += '<g transform="translate(92 70)"><path d="M2 8 l4 -8 l4 6 h6 l4 -6 l4 8z" fill="#4f5d75"/><circle cx="13" cy="12" r="9" fill="#4f5d75"/><ellipse cx="13" cy="28" rx="10" ry="9" fill="#4f5d75"/><circle cx="10" cy="11" r="1.6" fill="#ffd174"/><circle cx="16" cy="11" r="1.6" fill="#ffd174"/></g>';
    return s;
  },
  road: '<rect width="300" height="160" fill="#bfe0ff"/><rect y="70" width="300" height="90" fill="#cfe8c4"/><path d="M110 160 L140 70 h20 L190 160z" fill="#7d8799"/><path d="M168 112 L300 98 V126 L180 134z" fill="#7d8799"/><path d="M150 150 v-10 M150 128 v-8 M150 108 v-6 M150 92 v-4" stroke="#fff" stroke-width="3"/><g transform="translate(214 92)"><rect x="0" y="0" width="64" height="14" fill="#fff" stroke="#c8352e" stroke-width="2"/><path d="M6 0 l8 14 M22 0 l8 14 M38 0 l8 14 M54 0 l8 14" stroke="#c8352e" stroke-width="5"/><rect x="4" y="14" width="3" height="20" fill="#4f5d75"/><rect x="57" y="14" width="3" height="20" fill="#4f5d75"/><rect x="8" y="-24" width="48" height="20" rx="3" fill="#c8352e"/><text x="32" y="-10" text-anchor="middle" font-size="8.5" font-weight="800" fill="#fff">ROUTE BARRÉE</text></g><path d="M40 70 l20 -30 l20 30z M50 70 l18 -24 l18 24z" fill="#1f6b4a"/>',
  photo: '<rect width="300" height="200" fill="#bfe0ff"/><rect y="140" width="300" height="60" fill="#c9ced8"/><rect x="30" y="40" width="240" height="110" fill="#e8d3b0"/><rect x="60" y="14" width="180" height="30" rx="4" fill="#16305e"/><text x="150" y="35" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">ÉCOLE DES TILLEULS</text><g stroke="#4f5d75" stroke-width="4"><path d="M40 150 V80 M70 150 V80 M100 150 V80 M200 150 V80 M230 150 V80 M260 150 V80 M36 84 H104 M196 84 H264"/></g><circle cx="150" cy="96" r="18" fill="#e9b98a"/><path d="M132 90 q18 -24 36 0" fill="#2a1408"/><rect x="132" y="116" width="36" height="52" rx="12" fill="#1d64b3"/><path d="M132 124 l-16 -22 M168 124 l16 -22" stroke="#1d64b3" stroke-width="9" stroke-linecap="round"/><circle cx="144" cy="94" r="2" fill="#2a1408"/><circle cx="156" cy="94" r="2" fill="#2a1408"/><path d="M142 103 q8 7 16 0" stroke="#2a1408" stroke-width="2" fill="none"/>',
  salonBack: '<rect width="400" height="260" fill="#f3e3c3"/><rect y="200" width="400" height="60" fill="#b9875a"/><rect x="120" y="30" width="90" height="80" fill="#17346a" stroke="#fff" stroke-width="6"/><circle cx="140" cy="50" r="2" fill="#fff"/><circle cx="185" cy="70" r="2" fill="#fff"/><path d="M165 42 a10 10 0 1 0 8 14 a8 8 0 1 1 -8 -14z" fill="#fff4cf"/><rect x="20" y="110" width="90" height="90" fill="#a0522d"/><rect x="34" y="140" width="62" height="60" fill="#3a1d10"/><path d="M50 200 q6 -30 15 -20 q8 -24 14 0 q8 -10 10 20z" fill="#f2b632"/><path d="M58 200 q6 -18 10 -8 q6 -14 10 8z" fill="#e8590c"/><rect x="12" y="104" width="106" height="10" fill="#6e3d18"/>',
  salonFront: '<path d="M300 40 l50 90 h-100z M300 80 l60 110 h-120z" fill="#1f6b4a"/><rect x="292" y="190" width="16" height="16" fill="#6e3d18"/><g fill="#c8352e"><circle cx="280" cy="110" r="5"/><circle cx="326" cy="150" r="5"/><circle cx="270" cy="170" r="5"/></g><path d="M150 200 v-40 h110 v40z" fill="#c2410c"/><rect x="140" y="150" width="130" height="22" rx="8" fill="#d9541a"/><rect x="134" y="160" width="16" height="44" rx="6" fill="#d9541a"/><rect x="262" y="160" width="16" height="44" rx="6" fill="#d9541a"/><path d="M372 200 v-90" stroke="#4f5d75" stroke-width="4"/><path d="M352 112 h40 l-8 -28 h-24z" fill="#ffd174"/><g transform="translate(222 212)"><ellipse cx="20" cy="22" rx="20" ry="12" fill="#4f5d75"/><circle cx="40" cy="12" r="10" fill="#4f5d75"/><path d="M33 5 l2 -9 l5 6 M42 3 l5 -7 l2 9" fill="#4f5d75"/><path d="M0 22 q-16 -6 -10 -22" stroke="#4f5d75" stroke-width="5" fill="none"/></g>',
};
function tag(letter, x, y, rot) {
  return `<g class="tag" data-letter="${letter}" tabindex="0" role="button" aria-label="Étiquette cachée" transform="translate(${x} ${y}) rotate(${rot})"><rect x="-7" y="-6" width="14" height="12" rx="2.5" fill="#fff7e8" stroke="#b08a5a" stroke-width="1"/><text y="3.2" text-anchor="middle" font-size="8.5" font-weight="800" fill="#6e3d18">${letter}</text></g>`;
}
function chat(lines) {
  return h('div', { class: 'chat' }, lines.map(([who, text, mine]) => h('div', { class: 'msg' + (mine ? ' mine' : '') }, h('small', { text: who }), text)));
}

Object.assign(CASES, {
  2: {
    title: TITLES[2],
    kind: 'Défi du mercredi · 5 minutes',
    scene: [
      ['maya', 'J’écris à Mamie Lou pour lui rappeler les cadeaux de ce soir.'],
      ['bug', 'Je t’ai préparé un message. Rapide, efficace : « T’AS PAS OUBLIÉ LES CADEAUX ??? »'],
      ['octet', 'Hum… Sans voir ton visage ni entendre ta voix, Mamie risque de croire que tu es fâchée.'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Quel message Maya devrait envoyer ?',
      intro: chat([['Maya', 'T’AS PAS OUBLIÉ LES CADEAUX ???', true]]),
      options: [
        { label: '« Cadeaux. »', feedback: 'Pas tout à fait : un seul mot, c’est un peu sec. Mamie risque de se demander ce qui ne va pas.' },
        { label: '« Coucou Mamie ! Tu penses bien aux cadeaux pour ce soir ? 🎁 Bisous »', ok: true, feedback: 'Parfait ! Un bonjour, une vraie question et un petit emoji : Mamie comprend tout de suite que c’est gentil.' },
        { label: '« T’AS PAS OUBLIÉ ??? 😡 »', feedback: 'Pas tout à fait : les majuscules donnent l’impression de crier, et l’emoji fâché aussi.' },
      ],
    }),
    reflex: 'À l’écrit, on ne voit pas mon sourire. Avant d’envoyer, je relis mon message comme si je le recevais.',
    family: 'Choisissez un emoji chacun et devinez ce qu’il veut dire pour les autres. Est-ce que tout le monde le comprend pareil ?',
    grown: [
      'Sans le ton de la voix ni les expressions du visage, un message court peut paraître froid ou agressif. Les majuscules sont souvent lues comme des cris.',
      'Les emojis aident à donner le ton, mais leur sens varie d’une génération à l’autre : un même pouce levé peut sembler sympathique ou sec.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  3: {
    title: TITLES[3],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['nino', 'Regarde ce que j’ai trouvé dans le grenier de Mamie Lou ! C’est un dessous-de-verre ?'],
      ['mamie', 'Ah, ça ! Quand j’ai eu mon premier ordinateur, on ne pouvait pas s’en passer.'],
      ['octet', 'Un objet carré, plat, avec une petite trappe en métal… À ton avis, à quoi servait-il ?'],
    ],
    challenge: (done) => quiz(done, {
      question: 'À quoi servait cet objet ?',
      intro: art('0 0 120 120', DRAW.floppy, 'pic pic-small', 'Un carré de plastique bleu foncé avec une trappe en métal et une étiquette « Noël 1998 ».'),
      options: [
        { label: 'À écouter de la musique', feedback: 'Pas tout à fait : la musique, c’était plutôt les cassettes et les CD. Celui-ci gardait des fichiers.' },
        { label: 'À enregistrer et transporter des fichiers', ok: true, feedback: 'Exact ! C’est une disquette. On y enregistrait des textes, des dessins… et elle tenait dans la poche.' },
        { label: 'À poser son verre sur la table', feedback: 'Elle en a presque la taille ! Mais elle servait à garder des fichiers.' },
      ],
    }),
    reflex: 'L’icône « Enregistrer » ressemble encore à une disquette : maintenant, tu sais pourquoi !',
    family: 'Cherchez dans un logiciel ou une appli l’icône en forme de disquette. Et demandez aux grands-parents quels objets ils utilisaient pour garder leurs photos.',
    grown: [
      'La disquette 3 pouces et demi la plus répandue contenait 1,44 Mo : moins qu’une seule photo prise avec un téléphone récent.',
      'Elle a disparu au profit des CD, des clés USB puis du stockage en ligne, mais son dessin sert toujours d’icône pour « Enregistrer ».',
    ],
    source: 'Faits à vérifier avant publication.',
  },
  4: {
    title: TITLES[4],
    kind: 'Défi + jeu en famille',
    scene: [
      ['mamie', 'J’ai envoyé un message à tout le monde pour le marché de Noël.'],
      ['sam', 'Et moi j’ai reçu qu’il était annulé !'],
      ['bug', 'Hé hé, j’adore quand un message fait le tour : il change un tout petit peu à chaque fois.'],
      ['octet', 'Remontons la chaîne pour trouver où l’information s’est déformée.'],
    ],
    challenge: (done) => quiz(done, {
      question: 'À quel message l’information a-t-elle changé pour la première fois ?',
      intro: chat([
        ['1 · Mamie Lou', 'Le marché de Noël ouvre samedi à 14 h, place du village.'],
        ['2 · Maya', 'Marché de Noël samedi 14 h, place du village !'],
        ['3 · Nino', 'Le marché, c’est samedi à 4 h je crois.'],
        ['4 · Sam', 'Marché de Noël annulé samedi ?!'],
      ]),
      layout: 'row',
      options: [
        { label: 'Message 2', feedback: 'Pas encore : Maya a raccourci, mais l’heure et le lieu sont toujours bons.' },
        { label: 'Message 3', ok: true, feedback: 'Bien vu ! Nino a transformé « 14 h » en « 4 h » et ajouté « je crois ». Ensuite, la rumeur a grossi.' },
        { label: 'Message 4', feedback: 'Ici, c’est déjà très déformé, bien vu. Mais l’erreur a commencé un peu avant : regarde l’heure.' },
      ],
    }),
    reflex: 'Avant de faire suivre un message, je vérifie à la source : qui l’a écrit en premier ?',
    family: 'Jouez au message déformé : le premier chuchote une phrase à son voisin, et ainsi de suite. Comparez la phrase de départ et celle d’arrivée !',
    grown: [
      'Une information transférée de proche en proche perd souvent des détails ou en gagne. Sur les messageries, la mention « Transféré plusieurs fois » signale qu’on est loin de la source.',
      'Le réflexe : retrouver l’auteur d’origine ou une source officielle avant de partager.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  5: {
    title: TITLES[5],
    kind: 'Défi du week-end · 5 minutes',
    scene: [
      ['sam', 'Je crée un compte pour le jeu de Noël. Il me faut un mot de passe.'],
      ['bug', 'Mets « noel2026 », personne ne trouvera ! Enfin… sauf moi.'],
      ['octet', 'Un bon secret, c’est long et surprenant. Une phrase marche encore mieux qu’un mot.'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Quel secret résistera le mieux au Bug ?',
      layout: 'row',
      options: [
        { label: 'noel2026', feedback: 'C’est tentant, mais trop facile à deviner : c’est le premier que le Bug essaiera en décembre.' },
        { label: 'Octet!', feedback: 'Pas tout à fait : il est trop court, et tout le monde connaît le nom d’Octet ici.' },
        { label: 'Mon sapin mange 3 mandarines bleues', ok: true, feedback: 'Oui ! Une phrase longue et bizarre : facile à retenir pour toi, très dure à deviner pour le Bug.' },
      ],
    }),
    reflex: 'Mon secret est une phrase longue et rigolote, et je ne la donne à personne, même à un copain.',
    family: 'Inventez chacun une phrase absurde (sans la dire !) et vérifiez que vous vous en souvenez le lendemain.',
    grown: [
      'Les recommandations officielles privilégient la longueur : une phrase de passe de plusieurs mots est plus robuste et plus facile à retenir qu’un mot court compliqué.',
      'Un mot de passe différent par compte et un gestionnaire de mots de passe limitent les dégâts en cas de fuite.',
    ],
    source: 'Source à vérifier avant publication (pistes : cybermalveillance.gouv.fr, ANSSI).',
  },
  6: {
    title: TITLES[6],
    kind: 'Défi du dimanche · lettre cachée',
    scene: [
      ['octet', 'J’ai caché un mot pour la veillée dans mon code secret. Le Bug ne doit pas le lire !'],
      ['bug', 'Grrr… DBEFBV ? Ça ne veut rien dire !'],
      ['maya', 'Je connais le truc : dans le code d’Octet, chaque lettre a avancé d’un cran. Il suffit de les faire reculer !'],
    ],
    challenge: (done) => decoder(done, { encoded: 'DBEFBV', answer: 'CADEAU', okText: 'CADEAU ! Le Bug n’y a vu que du feu.' }),
    letterText: 'C comme CADEAU. Garde-la bien dans ton carnet.',
    reflex: 'Chiffrer, c’est transformer un message pour que seuls ceux qui ont la clé puissent le lire. Mes applis le font aussi, en bien plus compliqué !',
    family: 'Écrivez-vous des petits mots codés avec le code d’Octet, ou inventez votre propre code de famille.',
    grown: [
      'Ce code par décalage est l’un des plus anciens connus, attribué à Jules César. Il se casse en quelques secondes, mais il illustre bien l’idée de clé.',
      'Les messageries et les sites en « https » utilisent un chiffrement moderne qui protège les échanges pendant leur trajet.',
    ],
    source: 'Faits à vérifier avant publication.',
  },
  7: {
    title: TITLES[7],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['sam', 'Papa a reçu un SMS : un colis l’attend, il faut juste payer 1,99 €.'],
      ['bug', 'Clique, clique ! C’est peut-être un cadeau de Noël !'],
      ['octet', 'Stop. Avant de cliquer, cherchons ensemble ce qui cloche dans ce message.'],
    ],
    challenge: (done) => {
      const sms = h('div', { class: 'phone' },
        h('div', { class: 'phone-top' }, h('button', { type: 'button', class: 'spot', 'data-spot': 'ok', 'data-say': 'Bien vu : un transporteur n’écrit pas depuis un numéro de portable inconnu.' }, '0X XX XX XX XX')),
        h('div', { class: 'bubble-sms' },
          h('button', { type: 'button', class: 'spot', 'data-spot': 'no', 'data-say': 'Cette phrase seule n’a rien de bizarre. C’est l’ensemble du message qui doit t’alerter.' }, 'Votre colis n’a pas pu être livré.'), ' ',
          h('button', { type: 'button', class: 'spot', 'data-spot': 'ok', 'data-say': 'Oui : une toute petite somme pour te faire sortir la carte bancaire.' }, 'Des frais de 1,99 € sont à régler'), ' ',
          h('button', { type: 'button', class: 'spot', 'data-spot': 'ok', 'data-say': 'Exactement : l’urgence sert à t’empêcher de réfléchir.' }, 'sous 24 h'), ' : ',
          h('button', { type: 'button', class: 'spot link', 'data-spot': 'ok', 'data-say': 'Bravo : cette adresse ne ressemble pas au site officiel d’un transporteur.' }, 'colis-livraison-suivi.example')));
      return spot(done, { question: 'Touche les détails qui doivent t’alerter (il y en a au moins 3)', scene: sms, need: 3, foundText: 'Trois indices trouvés : c’est un faux SMS. On ne clique pas, on le supprime.' });
    },
    reflex: 'Je ne clique pas sur un lien reçu par SMS. Pour suivre un colis, je vais moi-même sur le site officiel.',
    family: 'Regardez ensemble les derniers SMS reçus : y en a-t-il un qui ressemble à celui-ci ?',
    grown: [
      'Les faux SMS de livraison sont très répandus, surtout à l’approche des fêtes. Le but : récupérer des données bancaires ou faire installer une application malveillante.',
      'On peut signaler gratuitement un SMS indésirable en le transférant au 33700.',
    ],
    source: 'Source à vérifier avant publication (pistes : cybermalveillance.gouv.fr, 33700.fr).',
  },
  8: {
    title: TITLES[8],
    kind: 'Défi du jour des Lumières',
    scene: [
      ['nino', 'Quand je lance une vidéo sur la tablette, elle vient d’où ?'],
      ['octet', 'De très loin ! Et ce soir, c’est la Fête des Lumières : ça tombe bien, une partie du voyage se fait… en lumière.'],
      ['bug', 'J’ai mélangé les étapes du voyage. Bonne chance pour les remettre dans l’ordre !'],
    ],
    challenge: (done) => order(done, {
      question: 'Remets dans l’ordre le trajet de ta demande, de la tablette jusqu’à la vidéo',
      items: [
        { label: 'La tablette envoie la demande' },
        { label: 'Les ondes Wi-Fi traversent la maison', hint: 'Pas encore : comment la demande sort-elle de la tablette, sans fil ?' },
        { label: 'La box la reçoit', hint: 'Pas encore : qui reçoit le Wi-Fi à la maison ?' },
        { label: 'La fibre l’emporte en lumière', hint: 'Pas encore : la box doit d’abord recevoir la demande.' },
        { label: 'Le serveur envoie la vidéo', hint: 'Le serveur, c’est tout au bout du voyage !' },
      ],
      doneText: 'Bravo ! Et la vidéo fait le même trajet dans l’autre sens, en une fraction de seconde.',
    }),
    reflex: 'Le Wi-Fi, c’est des ondes à la maison. Internet, c’est des câbles dans le monde entier, parfois avec de la lumière dedans.',
    family: 'Trouvez la box à la maison. Quels voyants s’allument quand quelqu’un regarde une vidéo ?',
    grown: [
      'Le Wi-Fi relie les appareils à la box par ondes radio. Au-delà, les données voyagent dans des câbles : cuivre, fibre optique (où l’information circule sous forme de lumière) et câbles sous-marins entre continents.',
      'Les vidéos sont stockées sur des serveurs, souvent proches de chez soi pour aller plus vite.',
    ],
    source: 'Faits à vérifier avant publication.',
  },
  9: {
    title: TITLES[9],
    kind: 'Défi photo du mercredi',
    scene: [
      ['maya', 'Je prends Mamie Lou en photo devant le sapin !'],
      ['bug', 'J’ai bougé ton téléphone pendant que tu ne regardais pas. Hi hi.'],
      ['octet', 'Une belle photo, c’est d’abord un bon cadrage. Laquelle garderais-tu ?'],
    ],
    challenge: (done) => {
      const frame = (vb, rot, label) => art(vb, `<rect x="-400" y="-400" width="1200" height="1000" fill="#d8c29a"/><g transform="rotate(${rot} 150 100)">${DRAW.room()}${DRAW.people}</g>`, 'pic pic-photo', label);
      return quiz(done, {
        question: 'Quelle photo Maya devrait garder ?',
        layout: 'cards',
        options: [
          { label: frame('60 110 170 110', 0, 'Photo coupée au niveau du cou : on ne voit pas les visages.'), feedback: 'Pas celle-là : les têtes sont coupées, on ne voit que les pulls.' },
          { label: frame('-120 -80 540 360', -12, 'Photo penchée et lointaine : les personnes sont minuscules.'), feedback: 'Pas celle-là : penchée et de loin, on cherche Mamie Lou dans le décor.' },
          { label: frame('70 30 220 150', 0, 'Photo bien cadrée : Maya et Mamie Lou souriantes, le sapin à côté.'), ok: true, feedback: 'Celle-là ! Les visages sont entiers, la photo est droite et le sapin est dans le cadre.' },
        ],
      });
    },
    reflex: 'Avant d’appuyer, je regarde les bords de l’écran : rien d’important ne doit être coupé.',
    family: 'Prenez chacun une photo de la même scène et comparez vos cadrages. Lequel préférez-vous, et pourquoi ?',
    grown: [
      'Activer la grille de l’appareil photo aide à garder l’horizon droit et à placer les sujets sur les lignes des tiers.',
      'Mieux vaut s’approcher que zoomer : le zoom numérique dégrade l’image.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  10: {
    title: TITLES[10],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['nino', 'Dans mon jeu, le Père Noël officiel veut m’offrir 10 000 gemmes !'],
      ['bug', 'Il demande juste ton mot de passe. C’est rien, un mot de passe…'],
      ['octet', 'Un vrai cadeau ne demande jamais ton mot de passe. Que devrait faire Nino ?'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Que doit faire Nino ?',
      intro: h('div', { class: 'game-chat' },
        h('p', { class: 'small', text: 'Royaume des Neiges · discussion' }),
        chat([
          ['PèreNoël_Officiel', 'Ho ho ho ! Pour Noël, je t’offre 10 000 gemmes 🎁'],
          ['PèreNoël_Officiel', 'Envoie-moi juste ton identifiant et ton mot de passe. Vite, l’offre se termine dans 5 minutes !'],
        ])),
      options: [
        { label: 'Il envoie son mot de passe : c’est le Père Noël !', feedback: 'Attention : avec ton mot de passe, cette personne pourrait prendre ton compte et tout ce qu’il contient.' },
        { label: 'Il répond pour lui demander s’il est vraiment le Père Noël', feedback: 'Douter, c’est une bonne idée ! Mais il te répondra que oui. Mieux vaut ne pas discuter avec lui.' },
        { label: 'Il ne répond pas, il signale le joueur et il en parle à un adulte', ok: true, feedback: 'Parfait ! Les gemmes gratuites contre un mot de passe, c’est toujours un piège.' },
      ],
    }),
    reflex: 'Mon mot de passe, c’est comme ma brosse à dents : je ne le prête à personne. Même au Père Noël.',
    family: 'Ouvrez ensemble les réglages d’un jeu de la maison : où se trouvent les boutons « Bloquer » et « Signaler » ?',
    grown: [
      'Les promesses de monnaie virtuelle gratuite (gemmes, V-bucks, Robux…) servent souvent à voler des comptes. Les éditeurs ne demandent jamais un mot de passe par message.',
      'Activer la double authentification sur les comptes de jeu des enfants et garder l’adresse e-mail du compte sous la main des parents facilite la récupération.',
    ],
    source: 'Source à vérifier avant publication (piste : cybermalveillance.gouv.fr).',
  },
  11: {
    title: TITLES[11],
    kind: 'À faire en famille · 15 minutes',
    scene: [
      ['sam', 'Octet, tu peux dessiner un robot pour la déco ?'],
      ['octet', 'Avec plaisir ! Mais aujourd’hui, on joue autrement : quelqu’un décrit, et quelqu’un dessine… sans voir le modèle.'],
      ['bug', 'Je parie que vous allez dessiner un grille-pain !'],
    ],
    challenge: (done) => together(done, {
      question: 'Le robot à l’aveugle',
      intro: h('p', { text: 'Il faut une feuille, un crayon, et au moins deux joueurs.' }),
      steps: [
        'Le conteur ouvre le modèle ci-dessous, sans le montrer au dessinateur.',
        'Il décrit le robot uniquement avec des mots : formes, tailles, positions.',
        'Le dessinateur n’a pas le droit de poser de questions… au premier tour.',
        'Comparez ! Puis recommencez en autorisant les questions.',
      ],
      reveal: { label: 'Le modèle (pour le conteur seulement)', content: art('0 0 120 140', DRAW.robot, 'pic pic-small', 'Robot : tête carrée avec antenne, deux yeux ronds, bouche rectangulaire, corps rectangulaire avec un triangle jaune, deux bras et deux jambes.') },
      okText: 'Alors, grille-pain ou robot ? Plus la consigne est précise, plus le dessin ressemble au modèle.',
    }),
    reflex: 'Un ordinateur fait exactement ce qu’on lui dit, pas ce qu’on voulait dire. Une consigne claire, ça change tout.',
    family: 'Qu’est-ce qui a le plus aidé : les formes, les tailles, ou le droit de poser des questions ?',
    grown: [
      'C’est le principe de la programmation : décrire une tâche étape par étape, sans ambiguïté.',
      'C’est aussi vrai avec les assistants d’intelligence artificielle : plus la demande est précise, plus la réponse est utile.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  12: {
    title: TITLES[12],
    kind: 'Défi du week-end · 5 minutes',
    scene: [
      ['maya', 'Super photo de Nino devant l’école ! Je la publie pour souhaiter de bonnes vacances ?'],
      ['bug', 'Publie-la en public ! Avec son prénom, et le nom de l’école, c’est plus mignon.'],
      ['octet', 'Avant de publier une photo de quelqu’un, on se pose deux questions : qu’est-ce qu’elle montre ? Et est-il d’accord ?'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Que devrait faire Maya ?',
      intro: art('0 0 300 200', DRAW.photo, 'pic pic-wide', 'Photo de Nino, bras levés, devant une grille avec le panneau « École des Tilleuls ».'),
      options: [
        { label: 'La publier en public avec « Nino, École des Tilleuls »', feedback: 'Pas tout à fait : avec le prénom et l’école, n’importe qui saurait où trouver Nino chaque jour.' },
        { label: 'La recadrer pour cacher le nom de l’école, et demander à Nino s’il est d’accord', ok: true, feedback: 'Oui ! On enlève ce qui permet de savoir où il est, et on lui demande son avis.' },
        { label: 'La publier telle quelle : c’est juste une photo', feedback: 'Pas tout à fait : une photo en dit long. Ici, le panneau montre où Nino va à l’école tous les jours.' },
      ],
    }),
    reflex: 'Avant de publier une photo, je cache ce qui dit où l’on vit ou où l’on va, et je demande l’accord de ceux qui sont dessus.',
    family: 'Choisissez une photo de famille : que montre-t-elle sans qu’on y pense (adresse, plaque, école, uniforme) ?',
    grown: [
      'Le nom d’une école, une plaque de rue ou un maillot de club suffisent à localiser un enfant. Une fois publiée, une image peut être copiée sans limite.',
      'Le droit à l’image s’applique aussi en famille : demander l’accord, y compris aux enfants, est une bonne habitude.',
    ],
    source: 'Source à vérifier avant publication (pistes : CNIL, jeprotegemonenfant.gouv.fr).',
  },
});

const FEED = {
  chats: ['Le chat et le sapin', 'Chaton contre papier cadeau', 'Top 10 des chats de Noël', 'Mon chat déteste la neige', 'Chat qui dort dans un bonnet', 'Le chat qui ouvre les cadeaux'],
  foot: ['Les plus beaux buts de l’année', 'Jongler en 5 étapes'],
  dessin: ['Dessiner un renne facile', 'Carte de Noël en 3 minutes'],
  cuisine: ['Biscuits de Noël rigolos', 'Chocolat chaud maison'],
  sciences: ['Pourquoi la neige est blanche ?', 'Construire une fusée en carton'],
  musique: ['Apprendre « Vive le vent » au piano', 'Chorale des pingouins'],
};
const FEED_COLORS = { chats: '#7c3aad', foot: '#1f7a55', dessin: '#e8590c', cuisine: '#c8352e', sciences: '#1d64b3', musique: '#b8860b' };

Object.assign(CASES, {
  14: {
    title: TITLES[14],
    kind: 'Défi éclair · 4 minutes',
    scene: [
      ['nino', 'Je voulais regarder une seule vidéo… et ça fait une heure que je suis là !'],
      ['bug', 'C’est moi qui choisis la suite. Je sais exactement ce qui te plaît. Hé hé.'],
      ['octet', 'Voyons comment la liste change quand tu regardes une vidéo.'],
    ],
    challenge(done) {
      const list = h('ul', { class: 'feed', 'aria-live': 'polite' });
      const status = h('p', { class: 'counter' });
      let clicks = 0;
      let theme;
      const after = h('div', { hidden: true });
      const draw = () => {
        const fav = theme ? FEED[theme].slice(0, Math.min(6, clicks * 2)) : [];
        const others = Object.keys(FEED).filter((t) => t !== theme).flatMap((t) => FEED[t].slice(0, 1).map((v) => [t, v]));
        const items = [...fav.map((v) => [theme, v]), ...others].slice(0, 6);
        list.replaceChildren(...items.map(([t, v]) => h('li', {}, h('button', { type: 'button', class: 'video', style: '--c:' + FEED_COLORS[t], disabled: clicks >= 3, onclick: () => {
          clicks++;
          theme = t;
          status.textContent = clicks < 3 ? 'Vidéo ' + clicks + ' regardée. Choisis-en une autre.' : 'Regarde ta liste maintenant…';
          draw();
          if (clicks === 3) after.hidden = false;
        } }, h('span', { class: 'thumb', 'aria-hidden': 'true' }, '▶'), v))));
      };
      draw();
      status.textContent = 'Clique sur 3 vidéos, une par une.';
      after.append(quiz(done, {
        question: 'Pourquoi ta liste ne montre presque plus que ça ?',
        options: [
          { label: 'C’est le hasard', feedback: 'Pas tout à fait : la liste a changé à chaque clic, ce n’est pas le hasard.' },
          { label: 'Un programme devine ce qui va te faire rester le plus longtemps', ok: true, feedback: 'Exactement ! Le programme de recommandation te montre toujours plus de ce que tu viens de regarder.' },
          { label: 'Il n’existe plus d’autres vidéos', feedback: 'Il en existe des millions ! Mais le programme ne te les propose plus.' },
        ],
      }));
      return h('div', {}, title('Ta liste « Pour toi »'), status, list, after);
    },
    reflex: 'C’est moi qui choisis quand j’arrête. Et de temps en temps, je cherche autre chose que ce qu’on me propose.',
    family: 'Fixez ensemble une règle pour les vidéos : combien, quand, et qui décide d’arrêter ?',
    grown: [
      'Les plateformes classent les vidéos avec des algorithmes de recommandation qui cherchent surtout à prolonger le temps passé. La lecture automatique enchaîne sans pause.',
      'Désactiver la lecture automatique et utiliser les profils enfants des plateformes aide à reprendre la main.',
    ],
    source: 'Source à vérifier avant publication (piste : jeprotegemonenfant.gouv.fr).',
  },
  15: {
    title: TITLES[15],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['sam', 'Alerte ! 50 cm de neige demain, c’est partagé partout ! On annule la veillée ?'],
      ['bug', 'Partage, partage ! Plus il y a de monde affolé, plus je m’amuse.'],
      ['octet', 'Nous sommes le mardi 15 décembre 2026. Une information peut avoir été vraie… et ne plus l’être du tout. Regarde bien ce message.'],
    ],
    challenge: (done) => {
      const post = h('div', { class: 'post' },
        h('p', { class: 'today' }, 'Aujourd’hui : ', h('strong', { text: 'mardi 15 décembre 2026' })),
        h('div', { class: 'post-head' },
          h('button', { type: 'button', class: 'spot', 'data-spot': 'no', 'data-say': 'Bien vu, ce compte n’a rien d’officiel. Mais il y a un indice encore plus simple : quand a-t-il été publié ?' }, 'MétéoInfos_Lol'),
          h('button', { type: 'button', class: 'spot date', 'data-spot': 'ok', 'data-say': '' }, 'publié le 12 janvier 2019')),
        h('p', {}, h('strong', { text: 'ALERTE NEIGE : 50 cm demain sur toute la région !' })),
        h('button', { type: 'button', class: 'spot', 'data-spot': 'no', 'data-say': 'Oui, « Partagez vite » pousse à agir sans réfléchir. Regarde aussi la date…' }, 'Partagez vite à tous vos proches !'),
        h('p', { class: 'small', text: '12 000 partages' }));
      return spot(done, { question: 'Nous sommes le 15 décembre 2026. Trouve l’indice qui montre que cette alerte ne parle pas de demain', scene: post, need: 1, foundText: 'Le message date de janvier 2019 ! Il circule encore, mais il parlait d’une autre journée, il y a presque huit ans.' });
    },
    reflex: 'Avant de partager une info, je regarde sa date et qui l’a publiée.',
    family: 'Pour la météo, quelle source fiable utilisez-vous à la maison ? Allez vérifier le temps de demain ensemble.',
    grown: [
      'De vieux messages refont régulièrement surface sans leur date : alertes, avis de disparition, promotions. Ils alimentent la confusion même lorsqu’ils étaient vrais à l’origine.',
      'Pour la météo et les vigilances, Météo-France reste la référence.',
    ],
    source: 'Source à vérifier avant publication (piste : meteofrance.com).',
  },
  16: {
    title: TITLES[16],
    kind: 'Défi du mercredi · 4 minutes',
    scene: [
      ['mamie', 'On part chercher la bûche chez le pâtissier. Le GPS connaît le chemin !'],
      ['bug', 'J’ai un peu chatouillé le GPS. Il ne sait pas que la route est en travaux.'],
      ['octet', 'Le GPS dit de tourner à droite… mais regarde dehors !'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Que doit faire Mamie Lou ?',
      intro: h('div', { class: 'gps' },
        art('0 0 300 160', DRAW.road, 'pic pic-wide', 'Vue de la route : à droite, un panneau rouge « Route barrée » et une barrière.'),
        h('p', { class: 'gps-screen' }, h('b', { text: '↱ Dans 50 m' }), ' Tournez à droite')),
      options: [
        { label: 'Tourner à droite : le GPS a toujours raison', feedback: 'Pas cette fois : la route est barrée. Le GPS ne voit pas tout.' },
        { label: 'S’arrêter au milieu de la route pour réfléchir', feedback: 'S’arrêter au milieu de la route serait dangereux. On continue prudemment et on laisse le GPS recalculer.' },
        { label: 'Suivre le panneau et laisser le GPS recalculer', ok: true, feedback: 'Bien joué ! Les panneaux et ce qu’on voit passent avant l’écran.' },
      ],
    }),
    reflex: 'L’écran m’aide, mais je garde les yeux ouverts : ce que je vois en vrai compte plus.',
    family: 'Préparez un petit trajet à pied avec une carte (sur écran ou papier) et repérez ensemble trois points de repère.',
    grown: [
      'Les applications de navigation reposent sur des cartes et des signalements qui peuvent avoir un temps de retard sur les travaux ou les fermetures.',
      'La signalisation sur place prime toujours sur les instructions du GPS.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  17: {
    title: TITLES[17],
    kind: 'Défi éclair · 4 minutes',
    scene: [
      ['sam', 'Mon téléphone a disparu ! Et toutes mes photos de Noël avec…'],
      ['bug', 'Elles sont perdues à jamais ! Mouah ha ha !'],
      ['octet', 'Pas forcément ! Tout dépend de ce que Sam avait préparé avant. Aide-le à faire la liste pour la prochaine fois.'],
    ],
    challenge: (done) => multi(done, {
      question: 'Coche les bonnes habitudes (il y en a 3)',
      options: [
        { label: 'Verrouiller l’écran avec un code', ok: true, feedback: 'Personne ne peut fouiller dans le téléphone.' },
        { label: 'Écrire le code sur la coque', feedback: 'Celui qui trouve le téléphone trouverait aussi le code.' },
        { label: 'Activer la sauvegarde automatique des photos', ok: true, feedback: 'Les photos sont aussi rangées ailleurs.' },
        { label: 'Activer la localisation de l’appareil', ok: true, feedback: 'On peut le retrouver, le faire sonner ou le bloquer à distance.' },
        { label: 'Ne jamais faire les mises à jour', feedback: 'Les mises à jour corrigent des failles de sécurité : mieux vaut les faire.' },
      ],
      okText: 'Bravo : verrouillage, sauvegarde et localisation. Avec ça, Sam peut retrouver ses photos sur un autre appareil.',
    }),
    reflex: 'Je prépare mon téléphone avant qu’il se perde : verrouillage, sauvegarde, localisation.',
    family: 'Vérifiez ensemble sur un téléphone de la maison : le verrouillage, la sauvegarde et la localisation sont-ils activés ?',
    grown: [
      'En cas de perte ou de vol : verrouiller ou effacer l’appareil à distance, changer les mots de passe importants, et faire bloquer la ligne auprès de l’opérateur.',
      'Pour aller plus loin, les BD d’Octet « Téléphone perdu ou volé » et « Sauvegardes » détaillent chaque étape.',
    ],
    source: 'Repris des BD S01E14 et S01E15, sourcées cybermalveillance.gouv.fr.',
  },
  18: {
    title: TITLES[18],
    kind: 'Défi éclair · 3 minutes',
    scene: [
      ['maya', 'J’ai demandé une image à une intelligence artificielle pour la carte de Noël.'],
      ['octet', 'Ta consigne était : « Un sapin bleu, trois cadeaux et un chat ». Vérifions si elle a bien écouté.'],
      ['bug', 'Moi je trouve qu’elles sont toutes parfaites. Enfin… presque.'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Quelle image respecte toute la consigne : un sapin bleu, trois cadeaux et un chat ?',
      layout: 'cards',
      options: [
        { label: art('0 0 120 120', DRAW.tree({ color: '#1f6b4a', gifts: 3, cat: true }), 'pic', 'Sapin vert, trois cadeaux, un chat.'), feedback: 'Pas celle-là : le sapin est vert. L’IA a oublié une partie de la consigne.' },
        { label: art('0 0 120 120', DRAW.tree({ color: '#1d64b3', gifts: 2, cat: true }), 'pic', 'Sapin bleu, deux cadeaux, un chat.'), feedback: 'Pas celle-là : compte les cadeaux, il n’y en a que deux.' },
        { label: art('0 0 120 120', DRAW.tree({ color: '#1d64b3', gifts: 3, cat: true }), 'pic', 'Sapin bleu, trois cadeaux, un chat.'), ok: true, feedback: 'Bravo ! Sapin bleu, trois cadeaux, un chat : tout y est.' },
      ],
    }),
    reflex: 'Une IA peut se tromper ou inventer. Je vérifie toujours le résultat avant de l’utiliser.',
    family: 'Jouez à « l’IA distraite » : l’un donne une consigne de dessin en trois points, l’autre dessine en oubliant exprès un détail. Qui le repère ?',
    grown: [
      'Les générateurs d’images respectent souvent mal les nombres, les couleurs ou les positions demandées. Les textes générés peuvent aussi contenir des erreurs affirmées avec assurance.',
      'Une image peut être entièrement fabriquée : la question « d’où vient-elle ? » vaut pour toutes les images qui circulent.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  19: {
    title: TITLES[19],
    kind: 'Défi du week-end · 5 minutes',
    scene: [
      ['octet', 'J’ai filmé un petit message pour la veillée. Mamie Lou entend mal : j’ai ajouté des sous-titres automatiques.'],
      ['bug', 'Je me suis glissé dans les sous-titres. Une phrase a… légèrement changé.'],
      ['nino', 'Coupe le son : on va lire seulement les sous-titres pour trouver l’erreur.'],
    ],
    challenge(done) {
      const lines = ['Bonsoir à tous et bienvenue à la veillée !', 'Ce soir, on chante, on joue et on rit.', 'Bonne veillée à toute la vanille !', 'Et à 21 h, on éteint les écrans.'];
      const sub = h('p', { class: 'subtitle', 'aria-live': 'polite' });
      const screen = h('div', { class: 'player' }, h('span', { class: 'art art-tete', 'aria-hidden': 'true' }), h('span', { class: 'mute', text: 'Son coupé' }), sub);
      const after = h('div', { hidden: true });
      let timer;
      const play = h('button', { type: 'button', onclick: () => {
        clearInterval(timer);
        let i = 0;
        sub.textContent = lines[0];
        timer = setInterval(() => {
          i++;
          if (i < lines.length) sub.textContent = lines[i];
          else { clearInterval(timer); sub.textContent = ''; after.hidden = false; play.textContent = 'Revoir la vidéo'; }
        }, 2600);
      } }, 'Lancer la vidéo');
      after.append(quiz(done, {
        question: 'Quelle phrase a été mal comprise par les sous-titres automatiques ?',
        options: lines.map((l, i) => ({ label: l, ok: i === 2, feedback: i === 2 ? 'Octet avait dit « famille ». La machine a entendu « vanille » : les sous-titres automatiques se trompent parfois !' : 'Celle-ci a bien du sens. Cherche une phrase un peu bizarre…' })),
      }));
      return h('div', {}, title('La vidéo d’Octet'), screen, play, h('p', { class: 'small', text: 'Les phrases s’affichent l’une après l’autre, environ 3 secondes chacune.' }), after);
    },
    reflex: 'Les sous-titres aident tout le monde à suivre. S’ils sont automatiques, je garde un œil sur les erreurs.',
    family: 'Regardez un dessin animé avec le son coupé et les sous-titres activés. Est-ce plus facile ou plus dur que prévu ?',
    grown: [
      'Les sous-titres sont indispensables aux personnes sourdes ou malentendantes et utiles à tous dans un lieu bruyant ou pour apprendre à lire.',
      'La transcription automatique a fait de grands progrès mais confond encore des mots proches, surtout avec des noms propres ou du bruit.',
    ],
    source: 'Contenu éditorial, sans chiffre à sourcer.',
  },
  20: {
    title: TITLES[20],
    kind: 'Défi du dimanche · lettre cachée',
    scene: [
      ['nino', 'Je regardais une vidéo sur la tablette, et deux messages sont apparus !'],
      ['bug', 'J’en ai écrit un des deux. Le plus effrayant, évidemment. Touche vite !'],
      ['octet', 'Pas de panique. Un vrai message t’explique calmement quoi faire. Un faux cherche à te faire peur pour que tu touches sans réfléchir.'],
    ],
    challenge: (done) => quiz(done, {
      question: 'Lequel est un piège du Bug ?',
      layout: 'cards',
      options: [
        { label: h('div', { class: 'errwin' }, h('b', { text: 'Réglages · Stockage' }), h('p', { text: 'Stockage presque plein. Supprime des vidéos ou des applis dont tu ne te sers plus pour libérer de la place.' })), feedback: 'Celui-ci est un vrai message de la tablette : il explique le problème et comment le régler, sans te presser.' },
        { label: h('div', { class: 'errwin errwin-fake' }, h('b', { text: '⚠ TABLETTE BLOQUÉE !' }), h('p', { text: '3 virus détectés ! Touche ici tout de suite pour la DÉBLOQUER.' })), ok: true, feedback: 'Bien vu ! Il fait peur, il presse et il veut que tu touches vite : c’est un piège du Bug.' },
      ],
    }),
    letterText: 'D comme DÉBLOQUER. La tablette n’était pas bloquée du tout : le Bug voulait juste que tu touches son bouton.',
    reflex: 'Un message qui me fait peur et me presse, c’est souvent un piège. Je ne touche à rien et j’appelle un adulte.',
    family: 'Si une fenêtre comme celle-ci apparaît, que fait-on à la maison ? Décidez ensemble qui appeler, sans crainte de se faire gronder.',
    grown: [
      'Ces fausses alertes s’affichent surtout sur des sites de vidéos ou de jeux gratuits. Elles poussent à installer une application, à souscrire un abonnement payant ou, chez les adultes, à appeler un faux support technique.',
      'Le bon réflexe : ne rien toucher dans la fenêtre, fermer l’onglet ou l’application, puis en parler. Un enfant qui a déjà touché doit pouvoir le dire sans peur : c’est ce qui permet de réagir vite.',
    ],
    source: 'Source à vérifier avant publication (piste : cybermalveillance.gouv.fr).',
  },
  21: {
    title: TITLES[21],
    kind: 'Vacances · à faire en famille',
    scene: [
      ['mamie', 'Tu vois ce téléphone avec une roue ? C’est avec lui que j’appelais ma mamie pour Noël.'],
      ['nino', 'Une roue ? Mais où sont les applis ?'],
      ['octet', 'Un même objet, trois générations. Range-les du plus ancien au plus récent.'],
    ],
    challenge: (done) => order(done, {
      question: 'Du plus ancien au plus récent',
      items: [
        { label: h('span', { class: 'phone-card' }, art('0 0 120 100', DRAW.dial, 'pic'), 'Le téléphone à cadran') },
        { label: h('span', { class: 'phone-card' }, art('0 0 120 100', DRAW.flip, 'pic'), 'Le portable à clapet'), hint: 'Pas encore : lequel a une roue pour composer le numéro ?' },
        { label: h('span', { class: 'phone-card' }, art('0 0 120 100', DRAW.smart, 'pic'), 'Le smartphone'), hint: 'Le smartphone, c’est le plus récent : il vient en dernier !' },
      ],
      doneText: 'Bravo ! Maintenant, la vraie partie se passe hors écran : interroge ta famille.',
    }),
    reflex: 'Les objets changent, les questions restent : avec qui je parle, et qu’est-ce que je partage ?',
    family: 'Interviewez un grand-parent : quel était ton premier téléphone ? Comment appelait-on pour Noël ? Qu’est-ce qui te manque, et qu’est-ce qui est mieux aujourd’hui ?',
    grown: [
      'Le téléphone à cadran a équipé les foyers pendant des décennies, avant le clavier à touches. Les portables se sont répandus à la fin des années 1990, les smartphones à partir de la fin des années 2000.',
      'Comparer les usages entre générations aide les enfants à voir le numérique comme une histoire, et les adultes à partager leurs propres repères.',
    ],
    source: 'Faits à vérifier avant publication.',
  },
  22: {
    title: TITLES[22],
    kind: 'Vacances · lecture en famille',
    scene: [
      ['octet', 'Ce soir, je vous lis une histoire : Le cadeau impossible. Maya, Nino, Sam… vous y êtes tous !'],
      ['maya', 'C’est celle avec le cadeau gratuit et le compte à rebours ?'],
      ['octet', 'Exactement. Et dedans, on apprend une méthode en trois mots. Le Bug les a mélangés…'],
    ],
    challenge: (done) => order(done, {
      question: 'Remets la méthode du livre dans l’ordre',
      intro: h('div', { class: 'book' },
        h('img', { src: 'https://lesingedunumerique.fr/images/octet-le-cadeau-impossible-cover.webp', alt: 'Couverture du livre Le cadeau impossible : Maya, Nino, Sam et Octet réunis dans une ruelle sous la pluie.', width: '800', height: '1000', loading: 'lazy' }),
        h('p', {}, h('strong', { text: 'Les aventures d’Octet · Tome 1' }), h('br'), 'Un cadeau gratuit. Un compte à rebours. Et quelque chose qui cloche. ',
          h('a', { href: 'https://lesingedunumerique.fr/blog/les-aventures-d-octet-commencent-ici-decouvrez-le-cadeau-impossible/', target: '_blank', rel: 'noopener', text: 'Lire l’histoire' }))),
      items: [
        { label: 'STOP : pourquoi ai-je envie d’agir maintenant ?' },
        { label: 'OBSERVE : qu’est-ce qu’on me demande vraiment ?', hint: 'Pas encore : avant d’observer, il faut s’arrêter.' },
        { label: 'VÉRIFIE : puis-je le confirmer autrement ?', hint: 'Pas encore : on vérifie après avoir observé.' },
        { label: 'Puis seulement : je décide.', hint: 'On décide tout à la fin !' },
      ],
      doneText: 'STOP, OBSERVE, VÉRIFIE… puis je décide. La méthode de Maya, Nino et Sam.',
    }),
    reflex: 'Quand on me pousse à agir vite : STOP, OBSERVE, VÉRIFIE. Puis seulement, je décide.',
    family: 'Lisez Le cadeau impossible ensemble. À chaque pause du livre, chacun dit ce qu’il aurait fait à la place des personnages.',
    grown: [
      'Le tome 1 montre comment l’envie, l’urgence et l’impression que « tout le monde le fait » sont utilisées pour faire agir avant de réfléchir.',
      'Il montre aussi qu’une erreur n’empêche pas de reprendre le contrôle : comprendre, demander de l’aide, corriger.',
    ],
    source: 'Extrait à choisir dans le tome avant publication.',
  },
  23: {
    title: TITLES[23],
    kind: 'Défi du mercredi · lettre cachée',
    scene: [
      ['sam', 'Le salon est prêt pour la veillée… mais le Bug a caché des étiquettes partout !'],
      ['bug', 'Six étiquettes, six lettres. Bonne chance, elles sont très bien cachées. Enfin, presque.'],
      ['octet', 'Ouvre grand les yeux. Les lettres forment un mot important pour ce soir.'],
    ],
    challenge(done) {
      const word = ['É', 'C', 'O', 'U', 'T', 'E'];
      const slots = word.map(() => h('b', { text: '?' }));
      const scene = art('0 0 400 260', DRAW.salonBack
        + tag('É', 359, 182, -14) + tag('O', 206, 201, -6) + tag('E', 238, 224, 18)
        + DRAW.salonFront
        + tag('C', 104, 100, 10) + tag('T', 206, 104, -12) + tag('U', 380, 97, 8), 'pic pic-scene', 'Le salon de la veillée : une fenêtre, une cheminée, un sapin, un canapé, une lampe et un chat. Des étiquettes y sont cachées.');
      scene.removeAttribute('aria-hidden');
      const box = feedbackBox();
      let found = 0;
      for (const el of scene.querySelectorAll('.tag')) {
        const pick = () => {
          if (el.classList.contains('found')) return;
          el.classList.add('found');
          found++;
          const letter = el.dataset.letter;
          const idx = word.findIndex((l, i) => l === letter && slots[i].textContent === '?');
          slots[idx].textContent = letter;
          slots[idx].parentElement.classList.add('found');
          sfx('pop');
          if (found === word.length) { say(box, true, 'ÉCOUTE ! Toutes les étiquettes sont trouvées.'); done(); }
          else say(box, true, 'Une étiquette « ' + letter + ' » ! Encore ' + (word.length - found) + '.');
        };
        el.addEventListener('click', pick);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      }
      return h('div', {},
        title('Trouve les six étiquettes cachées'),
        scene,
        h('ol', { class: 'letters word', 'aria-label': 'Lettres trouvées' }, slots.map((s) => h('li', {}, s))),
        h('p', { class: 'small', text: 'Au clavier, les étiquettes se parcourent avec la touche Tab.' }),
        box);
    },
    letterText: 'E comme ÉCOUTE. C’est la dernière lettre de ton carnet : le coffre t’attend demain !',
    reflex: 'Si quelque chose me gêne ou me fait peur en ligne, j’en parle à un adulte qui m’écoute. Ce n’est jamais trop tard.',
    family: 'Chacun dit à qui il pourrait parler s’il voyait quelque chose de bizarre ou de blessant sur un écran.',
    grown: [
      'Les enfants parlent plus facilement d’un problème en ligne quand ils savent qu’ils ne seront ni grondés ni privés d’écran. Écouter d’abord, agir ensuite.',
      'Pour le cyberharcèlement et les violences numériques chez les jeunes, le 3018 est gratuit, anonyme et confidentiel.',
    ],
    source: 'Source à vérifier avant publication (piste : 3018.fr, e-Enfance).',
  },
});


const STEP_NAMES = ['La scène', 'Le défi', 'La réponse'];
let current;
let justAdded;

function solve(day) {
  if (!current || current.day !== day) return;
  current.solved = true;
  if (!state.done.includes(day)) {
    state.done = valid({ ...state, done: [...state.done, day] }).done;
    save();
    count('done' + day);
    justAdded = day;
  }
  sfx('win');
  if ($('suivant')) $('suivant').disabled = false;
  const pills = $('etapes').children;
  if (pills[2] && !pills[2].querySelector('button')) {
    pills[2].replaceChildren(h('button', { type: 'button', class: 'step-btn', onclick: () => showStep(2) }, pills[2].textContent));
  }
}

function openCase(day) {
  if (!started) { started = true; count('starts'); }
  count('open' + day);
  current = { day, step: 0, solved: state.done.includes(day) };
  const def = CASES[day];
  $('case-meta').textContent = 'Case ' + day + ' · ' + weekday(day) + ' ' + day + ' décembre · ' + def.kind;
  $('case-titre').textContent = def.title;
  const dialog = $('case');
  dialog.showModal();
  const shutters = $('volets');
  $('volets-num').textContent = day;
  shutters.classList.remove('on');
  if (!reduced.matches) {
    void shutters.offsetWidth;
    shutters.classList.add('on');
    setTimeout(() => shutters.classList.remove('on'), 1400);
  }
  sfx('open');
  showStep(0);
  $('case-titre').focus();
}

function showStep(step) {
  if (!current) return;
  current.step = step;
  const def = CASES[current.day];
  const names = def.steps ?? STEP_NAMES;
  $('etapes').replaceChildren(...names.map((name, i) => {
    const reachable = i !== step && (i < 2 || current.solved);
    return h('li', { class: (i < step || (i === 1 && current.solved && step !== 1)) ? 'past' : '', 'aria-current': i === step ? 'step' : null },
      reachable ? h('button', { type: 'button', class: 'step-btn', onclick: () => showStep(i) }, name) : name);
  }));
  const back = (to, label) => h('button', { type: 'button', class: 'secondary', onclick: () => showStep(to) }, label);
  const body = $('case-corps');
  const foot = $('case-pied');
  body.scrollTop = 0;
  $('case').scrollTop = 0;
  stopVoice();
  if (step === 0) {
    body.replaceChildren(h('h3', { class: 'sr-only', tabindex: '-1', text: 'La scène' }), stage(def.scene, 'case-' + pad(current.day) + '-'));
    foot.replaceChildren(h('button', { type: 'button', onclick: () => showStep(1) }, current.day === 24 ? 'Ouvrir le cadenas →' : 'Relever le défi →'));
  } else if (step === 1) {
    const day = current.day;
    body.replaceChildren(def.challenge(() => solve(day)));
    const label = current.day === 24 ? 'Ouvrir le coffre →' : 'Voir la réponse d’Octet →';
    foot.replaceChildren(back(0, '← Revoir la scène'), h('button', { type: 'button', id: 'suivant', disabled: !current.solved, onclick: () => showStep(2) }, label));
  } else {
    if (current.day === 24) {
      body.replaceChildren(def.finale());
      foot.replaceChildren(back(1, '← Revoir le cadenas'), h('button', { type: 'button', onclick: () => {
        current.toDiploma = true;
        closeCase();
        const zone = $('diplome-zone');
        zone.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
        setTimeout(() => $('diplome-nom').focus({ preventScroll: true }), 400);
      } }, 'Préparer mon diplôme'));
    } else {
      body.replaceChildren(h('h3', { class: 'sr-only', tabindex: '-1', text: 'La réponse d’Octet' }), answer(def));
      foot.replaceChildren(back(1, '← Revoir le défi'), h('button', { type: 'button', onclick: () => closeCase() }, 'Accrocher la décoration au sapin'));
    }
  }
  if (step > 0) body.querySelector('h3[tabindex]')?.focus();
}

function burst() {
  if (reduced.matches) return;
  const layer = h('div', { class: 'burst', 'aria-hidden': 'true' });
  for (let i = 0; i < 36; i++) {
    const star = icon('star');
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 280;
    star.style.cssText = `left:50%;top:45%;fill:${ORNAMENTS[i % ORNAMENTS.length]};--x:${Math.cos(angle) * dist}px;--y:${Math.sin(angle) * dist}px;animation-delay:${Math.random() * .3}s`;
    layer.append(star);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 2200);
}

function ornamentSvg(color) {
  return `<svg viewBox="0 0 40 46" aria-hidden="true"><rect x="16" y="2" width="8" height="7" rx="2" fill="#b8860b"/><circle cx="20" cy="27" r="17" fill="${color}"/><path d="M8 24 q12 8 24 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/><circle cx="14" cy="20" r="4" fill="#fff" opacity=".55"/></svg>`;
}

function renderCalendar(focusDay) {
  const list = $('calendrier');
  list.replaceChildren();
  for (let day = 1; day <= 24; day++) {
    const done = state.done.includes(day);
    const open = prefs.test || day <= state.day;
    const playable = PLAYABLE.includes(day);
    const spoken = VOICES.has('case-' + pad(day) + '-');
    const classes = ['win', 'c' + ((day * 7) % 4)];
    let tag = '';
    let label = 'Case ' + day + ', ' + weekday(day) + ' ' + day + ' décembre';
    if (spoken) label += ', avec une scène à écouter';
    if (day === 24) classes.push('big24');
    if (done) { classes.push('done'); label += ', terminée : ' + TITLES[day]; }
    else if (!open) { classes.push('locked', 'snowy'); label += ', s’ouvrira à 7 heures'; }
    else if (!playable) { classes.push('locked'); tag = day === state.day ? 'Aujourd’hui' : 'À écrire'; label += ', pas encore écrite dans la maquette'; }
    else if (day === state.day) { classes.push('today'); tag = 'Ouvre-moi !'; label += ', à ouvrir aujourd’hui'; }
    else if (day > state.day) { classes.push('testopen'); label += ', ouverte en mode test'; }
    else { classes.push('catch'); tag = 'À rattraper'; label += ', à rattraper'; }
    const btn = h('button', { type: 'button', class: classes.join(' '), 'data-day': String(day), 'aria-label': label });
    const inside = h('span', { class: 'inside' });
    if (done) inside.innerHTML = ornamentSvg(ORNAMENTS[(day - 1) % ORNAMENTS.length]);
    btn.append(inside, h('span', { class: 'shutter l' }), h('span', { class: 'shutter r' }), h('span', { class: 'num', 'aria-hidden': 'true', text: String(day) }));
    if (tag) btn.append(h('span', { class: 'tag', 'aria-hidden': 'true', text: tag }));
    if (spoken) btn.append(icon('voice', 'voice-mark'));
    btn.addEventListener('click', () => {
      if (!open) {
        sfx('ko');
        toast('Patience ! La case ' + day + ' s’ouvrira ' + weekday(day) + ' ' + day + ' décembre à 7 h.');
      } else if (!playable) {
        toast('Cette case n’est pas encore écrite dans la maquette. Essaie les cases 1, 13 et 24.');
      } else openCase(day);
    });
    list.append(h('li', {}, btn));
  }
  if (focusDay) list.querySelector(`[data-day="${focusDay}"]`)?.focus();
}

function renderTree() {
  const tiers = [[16, 84, 38], [52, 136, 58], [96, 196, 80]];
  const halfWidth = (y) => Math.max(...tiers.map(([top, base, half]) => (y >= top && y <= base ? half * (y - top) / (base - top) : 0)));
  const rows = [[62, 2], [80, 3], [112, 4], [130, 5], [162, 5], [184, 5]];
  const spots = rows.flatMap(([y, n]) => {
    const w = halfWidth(y) * .78;
    return Array.from({ length: n }, (_, i) => [100 + (n === 1 ? 0 : -w + (2 * w * i) / (n - 1)), y]);
  });
  const order = [1, 7, 13, 19, 3, 9, 15, 21, 5, 11, 17, 23, 2, 8, 14, 20, 4, 10, 16, 22, 6, 12, 18, 24];
  const all = state.done.length === 24;
  let svg = '<svg viewBox="0 0 200 232" role="img" aria-labelledby="sapin-texte">'
    + '<ellipse cx="100" cy="222" rx="70" ry="8" fill="#e4ecf7"/>'
    + '<rect x="88" y="194" width="24" height="28" rx="3" fill="#6e3d18"/>'
    + tiers.map(([top, base, half]) => `<path d="M100 ${top} L${100 + half} ${base} Q100 ${base + 10} ${100 - half} ${base} Z" fill="#1f6b4a"/>`).join('')
    + '<path d="M66 96 Q100 112 134 92 M52 146 Q100 166 150 140" stroke="#f2b632" stroke-width="2" fill="none" stroke-dasharray="2 4" stroke-linecap="round"/>';
  spots.forEach(([x, y], i) => {
    const day = order[i];
    if (state.done.includes(day)) {
      svg += `<g class="orn${day === justAdded ? ' new' : ''}"><circle cx="${x.toFixed(1)}" cy="${y}" r="7" fill="${ORNAMENTS[(day - 1) % ORNAMENTS.length]}"/><circle cx="${(x - 2.2).toFixed(1)}" cy="${y - 2.4}" r="2" fill="#fff" opacity=".6"/></g>`;
    } else svg += `<circle cx="${x.toFixed(1)}" cy="${y}" r="3" fill="#174f37"/>`;
  });
  svg += `<g class="tree-star${all ? ' on' : ''}"><use href="#star" x="86" y="0" width="28" height="28" fill="${all ? '#f2b632' : 'none'}" stroke="${all ? '#b8860b' : '#9aa6bb'}" stroke-width="1.5" stroke-dasharray="${all ? '0' : '2 2'}"/></g></svg>`;
  $('sapin').innerHTML = svg;
  const n = state.done.length;
  $('sapin-texte').textContent = all
    ? 'Les 24 décorations sont accrochées : l’étoile brille !'
    : plural(n, 'décoration') + ' sur 24. À chaque case terminée, une nouvelle boule rejoint le sapin. L’étoile s’allume avec la 24e.';
}

function renderNotebook() {
  $('carnet').replaceChildren(...Object.entries(LETTERS).map(([day, letter]) => {
    const found = state.done.includes(Number(day));
    return h('li', { class: found ? 'found' : '' },
      h('b', { 'aria-hidden': 'true', text: found ? letter : '?' }),
      h('span', { text: 'Case ' + day }),
      h('span', { class: 'sr-only', text: found ? ' : lettre ' + letter : ' : pas encore trouvée' }));
  }));
}

function renderNext() {
  if (SITE) {
    const next = state.day + 1;
    const minutes = Math.max(0, Math.round((Date.UTC(YEAR, 11, next, 6) - Date.now()) / 60000));
    const wait = minutes >= 48 * 60 ? Math.round(minutes / 1440) + ' jours' : Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0');
    $('prochaine').textContent = state.day < 24
      ? 'La case ' + next + ' s’ouvrira ' + weekday(next) + ' ' + (next === 1 ? '1er' : next) + ' décembre à 7 h, dans ' + wait + '.'
      : 'Toutes les cases sont ouvertes. Tu peux rattraper celles qui manquent pendant les vacances.';
    return;
  }
  const now = new Date();
  const next = new Date(now);
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const minutes = Math.round((next - now) / 60000);
  const wait = Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0');
  $('prochaine').textContent = state.day < 24
    ? 'La case ' + (state.day + 1) + ' s’ouvrira ' + weekday(state.day + 1) + ' à 7 h, dans ' + wait + '.'
    : 'Toutes les cases sont ouvertes. Tu peux rattraper celles qui manquent jusqu’au 6 janvier.';
}

function renderDiploma() {
  const solved = state.done.includes(24);
  const n = state.done.length;
  $('diplome').classList.toggle('locked', !solved);
  $('diplome-statut').textContent = solved
    ? 'Le coffre est ouvert : ton diplôme t’attend. Écris ton prénom ou le nom de ton équipe.'
    : 'Ouvre le coffre de Noël le 24 décembre pour débloquer ton diplôme. Avec les 24 cases, il reçoit l’étoile « Avent complété ».';
  $('diplome-form').hidden = !solved;
  $('dip-compte').textContent = plural(n, 'case') + ' explorée' + (n > 1 ? 's' : '') + ' sur 24';
  $('dip-sceau').hidden = n < 24;
  if (!solved) $('imprimer').hidden = true;
}

function renderGame() {
  const open = state.done.includes(24) || prefs.test;
  $('jeu-zone').classList.toggle('locked', !open);
  $('jeu-statut').textContent = open
    ? 'Le coffre est ouvert : imprimez le jeu et jouez en famille, sans écran.'
    : 'Le Bug l’a enfermé dans son coffre : trouve les quatre lettres pour le libérer le 24 décembre.';
  $('imprimer-jeu').hidden = !open;
}

function renderAll(focusDay) {
  const chapter = chapterOf(state.day);
  $('chapitre').textContent = 'Chapitre ' + chapter.n + ' · ' + chapter.title;
  const n = state.done.length;
  $('progression').textContent = n ? plural(n, 'fenêtre') + ' ouverte' + (n > 1 ? 's' : '') + ' sur 24'
    : state.day === 0 ? 'Les fenêtres s’ouvrent une par une à partir du mardi 1er décembre, à 7 h.'
    : 'Aucune fenêtre ouverte pour l’instant. Commence par celle qui brille !';
  $('case-du-jour').disabled = state.day === 0;
  $('case-du-jour').textContent = state.day === 0 ? 'Ouverture le 1er décembre' : 'Ouvrir la fenêtre du jour';
  renderCalendar(focusDay);
  renderTree();
  renderNotebook();
  renderNext();
  renderDiploma();
  renderGame();
  $('jour').value = String(state.day);
  if (justAdded) {
    const day = justAdded;
    justAdded = undefined;
    sfx('pop');
    toast(day === 24 ? 'Le coffre est ouvert ! Ton diplôme t’attend en bas de la page.' : LETTERS[day] ? 'Décoration accrochée, et lettre ' + LETTERS[day] + ' ajoutée au carnet !' : 'Décoration accrochée au sapin !');
  }
}

function ics() {
  const url = location.origin + location.pathname;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Le Singe du Numerique//Avent d Octet//FR', 'CALSCALE:GREGORIAN'];
  for (let day = 1; day <= 24; day++) {
    const d = String(day).padStart(2, '0');
    lines.push('BEGIN:VEVENT', `UID:avent-octet-${YEAR}-${d}@lesingedunumerique.fr`, `DTSTAMP:${YEAR}1115T000000Z`,
      `DTSTART:${YEAR}12${d}T060000Z`, `DTEND:${YEAR}12${d}T061500Z`, `SUMMARY:Case ${day} du calendrier d’Octet`,
      'DESCRIPTION:Une nouvelle fenêtre t’attend dans la maison d’Octet.', `URL:${url}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const link = h('a', { href: URL.createObjectURL(blob), download: 'avent-octet-rappels.ics' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  count('agenda');
  toast('Fichier d’agenda prêt : ouvre-le pour ajouter les 24 rendez-vous de 7 h.');
}

async function copyResume() {
  const link = new URL(location.href);
  link.hash = new URLSearchParams({ reprise: state.day + '-' + state.done.join('.') }).toString();
  count('links');
  try {
    await navigator.clipboard.writeText(link.href);
    toast('Lien copié ! Ouvre-le sur l’autre appareil pour retrouver ta partie.');
  } catch {
    toast('Copie impossible ici. Voici ton lien : ' + link.href);
  }
}

function applyPrefs() {
  document.documentElement.classList.toggle('big', prefs.big);
  $('toggle-sound').setAttribute('aria-pressed', String(prefs.sound));
  $('toggle-big').setAttribute('aria-pressed', String(prefs.big));
  $('toggle-test').setAttribute('aria-pressed', String(prefs.test));
  $('bandeau-test').hidden = !prefs.test;
  write(PREFS_KEY, prefs);
}

function snow() {
  if (reduced.matches) return;
  const layer = document.querySelector('.snow');
  for (let i = 0; i < 46; i++) {
    const flake = document.createElement('i');
    const size = 2 + Math.random() * 4;
    flake.style.cssText = `left:${Math.random() * 100}%;--s:${size}px;--d:${7 + Math.random() * 9}s;--w:${-Math.random() * 16}s;--x:${(Math.random() - .5) * 120}px;opacity:${.4 + size / 10}`;
    layer.append(flake);
  }
}

function afterClose() {
  if (!current || $('case').open) return;
  stopVoice();
  if (ctx) stopSounds();
  const day = current.toDiploma ? undefined : current.day;
  current = undefined;
  renderAll(day);
}
function closeCase() {
  if ($('case').open) $('case').close();
  afterClose();
}
$('case').addEventListener('close', afterClose);
$('fermer').addEventListener('click', () => closeCase());
$('toggle-sound').addEventListener('click', () => {
  prefs.sound = !prefs.sound;
  applyPrefs();
  if (prefs.sound) sfx('pop');
});
$('toggle-big').addEventListener('click', () => { prefs.big = !prefs.big; applyPrefs(); });
$('toggle-test').addEventListener('click', () => {
  prefs.test = !prefs.test;
  applyPrefs();
  renderAll();
  toast(prefs.test ? 'Mode test activé : les 24 portes s’ouvrent.' : 'Mode test désactivé : les portes suivent le jour simulé.');
});
$('agenda').addEventListener('click', ics);
$('reprise').addEventListener('click', copyResume);
$('diplome-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('diplome-nom').value.trim();
  if (!name) return;
  $('dip-nom').textContent = name;
  $('imprimer').hidden = false;
  count('diplomas');
  toast('Ton diplôme est prêt. Tu peux l’imprimer ou l’enregistrer en PDF.');
});
$('imprimer').addEventListener('click', () => { count('print'); window.print(); });
$('imprimer-jeu').addEventListener('click', () => count('game'));
$('carnet-pdf').addEventListener('click', () => count('carnet'));
$('case-du-jour').addEventListener('click', () => openCase(Math.min(state.day, 24)));

$('jour').replaceChildren(...Array.from({ length: 24 }, (_, i) => h('option', { value: String(i + 1), text: (i + 1) + ' décembre (' + weekday(i + 1) + ')' })));
$('jour').addEventListener('change', (e) => { state.day = Number(e.target.value); save(); renderAll(); });
$('sim-indices').addEventListener('click', () => { state.done = valid({ ...state, done: [...state.done, 6, 20, 23] }).done; save(); renderAll(); toast('Lettres C, D et E ajoutées au carnet.'); });
$('sim-tout').addEventListener('click', () => { state = valid({ day: 24, done: Array.from({ length: 24 }, (_, i) => i + 1) }); save(); renderAll(); });
$('raz').addEventListener('click', () => {
  state = valid({});
  started = false;
  save();
  $('diplome-form').reset();
  $('dip-nom').textContent = 'Ton prénom ici';
  renderAll();
  toast('Partie remise à zéro.');
});
for (const btn of document.querySelectorAll('[data-canal]')) {
  btn.addEventListener('click', () => { count(btn.dataset.canal); toast('Arrivée simulée depuis ' + (btn.dataset.canal === 'facebook' ? 'Facebook' : 'Instagram') + '.'); });
}

const narrow = matchMedia('(max-width: 600px)');
const frameHero = () => document.querySelector('.hero-scene').setAttribute('preserveAspectRatio', narrow.matches ? 'xMinYMax slice' : 'xMidYMax slice');
narrow.addEventListener('change', frameHero);
frameHero();
applyPrefs();
renderStats();
snow();
renderAll();
if (SITE) {
  for (const el of document.querySelectorAll('details.sandbox, #toggle-test, #bandeau-test')) el.style.display = 'none';
}
setInterval(() => {
  if (SITE && parisDay() !== state.day && !$('case').open) {
    state.day = parisDay();
    renderAll();
  } else renderNext();
}, 30000);
