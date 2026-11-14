const get = (id) => document.getElementById(id);
const days = { 1: 'Sur lequel cliquerais-tu ?', 13: 'Le bruit d’Internet', 24: 'Le grand jeu d’Octet' };
const key = 'octet-avent-2026-sandbox-v1';
const statsKey = key + '-stats';
const empty = () => ({ done: [], day: 1 });
const validState = (value) => ({
  day: [1, 12, 13, 24].includes(value?.day) ? value.day : 1,
  done: [...new Set(Array.isArray(value?.done) ? value.done.filter((day) => [1, 13, 24].includes(day)) : [])],
});
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {
    get('notice').textContent = 'Ce navigateur bloque la sauvegarde. Copie ton lien pour reprendre plus tard.';
  }
}
let state = validState(read(key, empty()));
const restored = new URLSearchParams(location.hash.slice(1)).get('reprise');
if (restored) {
  try {
    const imported = validState(JSON.parse(restored));
    state = validState({ day: imported.day, done: [...state.done, ...imported.done] });
    save(key, state);
  } catch { get('notice').textContent = 'Ce lien de reprise est illisible.'; }
  history.replaceState(null, '', location.pathname + location.search);
}
const stats = read(statsKey, {});
const labels = {
  visits: 'Visites', starts: 'Parties commencées', resumes: 'Reprises',
  facebook: 'Arrivées Facebook simulées', instagram: 'Arrivées Instagram simulées',
  open1: 'Case 1 · Ouvertures', done1: 'Case 1 · Validations',
  open13: 'Case 13 · Ouvertures', done13: 'Case 13 · Validations',
  open24: 'Case 24 · Ouvertures', done24: 'Énigmes résolues', print: 'Demandes d’impression ou PDF',
};
function count(event) {
  stats[event] = (stats[event] ?? 0) + 1;
  save(statsKey, stats);
  get('stats').replaceChildren(...Object.entries(labels).flatMap(([key, label]) => {
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = label;
    value.textContent = stats[key] ?? 0;
    return [term, value];
  }));
}
let opened;
let started = state.done.length > 0;
let audio;
let activeTone;
count('visits');
if (restored || started) count('resumes');

function renderGrid() {
  get('date').value = state.day;
  const calendar = get('calendar');
  calendar.replaceChildren();
  for (let day = 1; day <= 24; day++) {
    const tile = document.createElement('button');
    const done = state.done.includes(day);
    const title = days[day];
    const locked = day > state.day;
    tile.disabled = locked || !title;
    tile.textContent = done ? day + ' ✓' : day;
    tile.setAttribute('aria-label', 'Case ' + day + (locked ? ', fermée' : title ? ', ' + title : ', indisponible dans cet aperçu') + (done ? ', terminée' : ''));
    if (day === opened) tile.setAttribute('aria-current', 'true');
    tile.classList.toggle('done', done);
    tile.addEventListener('click', () => openDay(day));
    calendar.append(tile);
  }
  get('progress').textContent = state.done.length + ' case(s) sur 3 dans la démo · ' + Number(state.done.includes(13)) + ' indice trouvé dans une case';
  const solved = state.day >= 24 && state.done.includes(24);
  get('award-status').textContent = solved ? 'Ton diplôme est débloqué.' : 'Résous l’énigme du 24 décembre pour obtenir ton diplôme.';
  get('award-form').hidden = !solved;
  if (!solved) {
    get('diploma').hidden = true;
    get('print').hidden = true;
  }
}
function complete(day) {
  if (!state.done.includes(day)) {
    state.done.push(day);
    save(key, state);
    count('done' + day);
    renderGrid();
  }
}
function quiz(question, answers, correct, explanation) {
  const prompt = document.createElement('p');
  prompt.textContent = question;
  const choices = document.createElement('div');
  choices.className = 'choices';
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  for (const [index, answer] of answers.entries()) {
    const button = document.createElement('button');
    button.textContent = answer;
    button.addEventListener('click', () => {
      feedback.textContent = index === correct ? explanation : 'Essaie encore !';
      if (index === correct) complete(opened);
    });
    choices.append(button);
  }
  get('content').append(prompt, choices, feedback);
}
async function play(frequencies, feedback) {
  try {
    audio ??= new AudioContext();
    await audio.resume();
    if (activeTone) activeTone.stop();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.connect(gain).connect(audio.destination);
    const now = audio.currentTime;
    frequencies.forEach((hz, index) => tone.frequency.setValueAtTime(hz, now + index * .15));
    gain.gain.setValueAtTime(.035, now);
    gain.gain.linearRampToValueAtTime(0, now + frequencies.length * .15);
    tone.addEventListener('ended', () => { if (activeTone === tone) activeTone = undefined; });
    activeTone = tone;
    tone.start(now);
    tone.stop(now + frequencies.length * .15);
  } catch { feedback.textContent = 'Le son est indisponible. Les descriptions permettent aussi de jouer.'; }
}

function openDay(day) {
  opened = day;
  if (!started) {
    started = true;
    count('starts');
  }
  count('open' + day);
  renderGrid();
  get('activity-title').textContent = days[day];
  get('activity-title').focus();
  const content = get('content');
  content.replaceChildren();
  if (day === 1) {
    quiz('Octet cherche son cahier de jeux. Quel bouton lui conseillerais-tu ?', ['A · Télécharger maintenant (Publicité)', 'B · Cahier de jeux (PDF, 2 Mo)', 'C · Installer pour télécharger'], 1, 'Bien vu ! B indique le nom et le format du fichier. A est une publicité.');
  } else if (day === 13) {
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const sounds = document.createElement('div');
    sounds.className = 'choices';
    for (const [index, frequencies] of [[550], [440, 1100, 920, 1830, 790, 1560], [220, 165]].entries()) {
      const button = document.createElement('button');
      button.textContent = 'Écouter le son ' + (index + 1);
      button.addEventListener('click', () => play(frequencies, status));
      sounds.append(button);
    }
    content.append(sounds, status);
    quiz('Ces sons sont recréés pour le jeu. Lequel imite le modem qui permettait de se connecter à Internet par téléphone ?', ['1 · Bip bref', '2 · Suite de sifflements', '3 · Deux sons graves'], 1, 'C’est le son 2. Ton indice est O comme ONDE.');
  } else {
    const form = document.createElement('form');
    const label = document.createElement('label');
    label.textContent = 'Mot mystère ';
    const input = document.createElement('input');
    input.maxLength = 12;
    input.required = true;
    label.append(input);
    const submit = document.createElement('button');
    submit.textContent = 'Valider';
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    const hints = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Retrouver les indices';
    const list = document.createElement('p');
    list.textContent = 'Prends la première lettre de CADEAU, ONDE, DÉBLOQUER et ÉCOUTE.';
    hints.append(summary, list);
    form.append(label, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (input.value.trim().toUpperCase() === 'CODE') {
        complete(24);
        message.textContent = 'Bravo ! Ton diplôme t’attend dans « Mon diplôme ».';
      } else {
        message.textContent = 'Essaie encore ou retrouve les indices ci-dessous.';
      }
    });
    content.append(form, message, hints);
  }
}
function clearActivity() {
  opened = undefined;
  get('activity-title').textContent = 'Choisis une case';
  get('content').replaceChildren();
}
get('date').addEventListener('change', (event) => {
  state.day = Number(event.target.value);
  save(key, state);
  if (opened > state.day) clearActivity();
  renderGrid();
});
get('reset').addEventListener('click', () => {
  state = empty();
  started = false;
  clearActivity();
  get('award-form').reset();
  get('winner').textContent = '';
  save(key, state);
  renderGrid();
});
get('resume').addEventListener('click', async () => {
  const link = new URL(location.href);
  link.hash = new URLSearchParams({ reprise: JSON.stringify(state) }).toString();
  const notice = get('notice');
  try {
    await navigator.clipboard.writeText(link.href);
    notice.textContent = 'Lien de reprise copié.';
  } catch {
    const field = document.createElement('input');
    field.value = link.href;
    field.readOnly = true;
    field.setAttribute('aria-label', 'Lien de reprise à copier');
    notice.replaceChildren(field);
    field.select();
  }
});
get('award-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = get('award-name').value.trim();
  if (!name) return;
  get('winner').textContent = name;
  get('diploma').hidden = false;
  get('print').hidden = false;
});
get('print').addEventListener('click', () => {
  count('print');
  window.print();
});
for (const button of document.querySelectorAll('[data-channel]')) {
  button.addEventListener('click', () => {
    count(button.dataset.channel);
    get('notice').textContent = 'Arrivée simulée depuis ' + button.textContent.split(' ').at(-1) + '.';
  });
}
renderGrid();
