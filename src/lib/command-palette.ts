export type SearchEntry = { title: string; description: string; type: string; href: string; keywords: string };
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const concepts = [
  ['arnaque', 'suspect', 'phishing', 'hameconnage', 'sms', 'colis', 'fraude'],
  ['securiser', 'comptes', 'passe', '2fa', 'authentification', 'securite'],
  ['photos', 'sauvegarde', 'sauvegardes', 'fichiers', 'perdu', 'stockage'],
  ['enfants', 'enfant', 'famille', 'jeunes', 'ados', 'harcelement', 'parental'],
];
const ignored = new Set(['un','une','le','la','les','de','des','du','mes','mon','ma','je','me','a','et','en','pour','comment','avec','est','que','qui']);
const distance = (a: string, b: string): number => {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length];
};
export function scoreEntry(entry: SearchEntry, query: string): number {
  const phrase = normalizeSearch(query);
  const words = phrase.split(' ').filter(w => w && !ignored.has(w));
  if (!words.length) return 0;
  const title = normalizeSearch(entry.title);
  const description = normalizeSearch(entry.description);
  const body = normalizeSearch(entry.keywords);
  let score = title.includes(phrase) ? 50 : 0;
  let matches = 0;
  for (const word of words) {
    let weight = title.includes(word) ? 16 : description.includes(word) ? 8 : body.includes(word) ? 3 : 0;
    if (!weight && word.length >= 4 && title.split(' ').some(t => Math.abs(t.length - word.length) <= 1 && distance(word, t) <= 1)) weight = 6;
    if (!weight && concepts.some(group => group.includes(word) && group.some(alias => `${title} ${description}`.includes(alias)))) weight = 2;
    if (weight) matches++;
    score += weight;
  }
  return matches === words.length ? score + 20 : matches >= Math.ceil(words.length / 2) ? score : 0;
}
export function initCommandPalette() {
  const dialog = document.querySelector<HTMLDialogElement>('#command-palette');
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>('#command-input')!;
  const list = dialog.querySelector<HTMLUListElement>('#command-results')!;
  const status = dialog.querySelector<HTMLElement>('#command-status')!;
  const suggestions = dialog.querySelector<HTMLElement>('#command-suggestions')!;
  let entries: SearchEntry[] = [], visible: SearchEntry[] = [], selected = -1, kind = 'Tout';
  let loaded = false, pending: Promise<void> | undefined, failed = false;
  let opener: HTMLElement | null = null, oldOverflow = '';
  const storageKey = 'octet-recent-resources';
  const recent = (): string[] => { try { const data = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(data) ? data.filter(x => typeof x === 'string').slice(0, 5) : []; } catch { return []; } };
  const actions = (): SearchEntry[] => [
    { title: document.body.classList.contains('light-mode') ? 'Activer le thème sombre' : 'Activer le thème clair', description: 'Adapter le confort de lecture', type:'Actions', href:'action:theme', keywords:'apparence nuit jour couleur' },
    { title:'Copier le lien de cette page', description:'Partager cette ressource avec un proche', type:'Actions', href:'action:copy', keywords:'partager adresse url' },
    { title:'Revenir en haut de la page', description:'Retrouver le début de la lecture', type:'Actions', href:'action:top', keywords:'debut remonter' },
    { title:'Effacer les ressources récentes', description:'Supprimer la liste enregistrée dans ce navigateur', type:'Actions', href:'action:clear', keywords:'historique confidentialite oublier' },
  ];
  function select(index: number, scroll = true) {
    selected = index;
    Array.from(list.children).forEach((element, i) => element.setAttribute('aria-selected', String(i === index)));
    const node = list.children[index];
    if (node) { input.setAttribute('aria-activedescendant', node.id); if (scroll) node.scrollIntoView({ block:'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }
  function render() {
    const query = input.value.trim();
    suggestions.hidden = !!query || kind !== 'Tout';
    const pool = [...entries, ...actions()].filter(e => kind === 'Tout' || e.type === kind);
    let total = 0;
    if (query) {
      const ranked = pool.map(entry => ({ entry, score: scoreEntry(entry, query) })).filter(e => e.score > 0).sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'fr'));
      total = ranked.length; visible = ranked.slice(0, 30).map(e => e.entry);
    } else if (kind !== 'Tout') { total = pool.length; visible = pool.slice(0,30); }
    else {
      const history = recent().flatMap(href => entries.find(e => e.href === href) ?? []);
      visible = [...history, ...entries.filter(e => e.type === 'Rubriques' && !history.some(h => h.href === e.href)), ...actions()].slice(0,18);
    }
    list.replaceChildren();
    for (const [i, entry] of visible.entries()) {
      const item = document.createElement('li'); item.id = `command-option-${i}`; item.setAttribute('role','option'); item.setAttribute('aria-selected','false');
      const type = document.createElement('small'); type.textContent = `${entry.type}${!query && recent().includes(entry.href) ? ' · Récent' : ''}`;
      const title = document.createElement('strong'); title.textContent = entry.title;
      const description = document.createElement('p'); description.textContent = entry.description.slice(0,180);
      item.append(type,title,description); item.addEventListener('click', () => void activate(entry));
      item.addEventListener('pointermove', () => select(i,false)); list.append(item);
    }
    status.textContent = failed ? 'Les ressources ne se chargent pas. Les actions restent disponibles. Fermez puis rouvrez pour réessayer.' : !loaded ? 'Chargement des ressources…' : query || kind !== 'Tout' ? total ? `${total} résultat${total > 1 ? 's' : ''}${total > 30 ? ' · les 30 premiers affichés, précisez votre recherche' : ''}` : 'Aucun résultat. Essayez « arnaque », « photos » ou un autre format.' : 'Vos ressources récentes, les rubriques et les actions utiles';
    select(visible.length ? 0 : -1, false);
  }
  async function activate(entry: SearchEntry) {
    if (!entry.href.startsWith('action:')) {
      try { localStorage.setItem(storageKey, JSON.stringify([entry.href, ...recent().filter(href => href !== entry.href)].slice(0,5))); } catch { /* La recherche fonctionne sans stockage. */ }
      dialog!.close(); location.assign(entry.href); return;
    }
    switch(entry.href) {
      case 'action:theme': document.querySelector<HTMLButtonElement>('#theme-toggle')?.click(); render(); break;
      case 'action:clear': try { localStorage.removeItem(storageKey); } catch {} render(); status.textContent = 'Les ressources récentes ont été effacées.'; break;
      case 'action:top': dialog!.close(); window.scrollTo({ top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); break;
      case 'action:copy': try { await navigator.clipboard.writeText(location.href); status.textContent = 'Lien copié !'; } catch { status.textContent = 'La copie est indisponible. Copiez l’adresse depuis votre navigateur.'; } break;
    }
  }
  async function load() {
    if (loaded) return;
    if (!pending) pending = (async () => {
      failed = false;
      try { const response = await fetch('/recherche.json'); if (!response.ok) throw Error('index'); entries = await response.json(); loaded = true; } catch { failed = true; } finally { pending = undefined; if (dialog!.open) render(); }
    })();
    await pending;
  }
  function open() {
    if (dialog!.open) return;
    // Refermer le menu mobile avant d'ouvrir une seconde interface modale.
    const burger = document.querySelector<HTMLButtonElement>('#burger-btn[aria-expanded="true"]');
    burger?.click();
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog!.showModal(); input.value = ''; kind = 'Tout';
    dialog!.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.kind === kind)));
    render(); input.focus(); void load();
  }
  document.querySelector('.search-launch')?.addEventListener('click',open);
  document.querySelectorAll<HTMLElement>('.search-launch kbd').forEach(k => k.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K');
  dialog.querySelector('.command-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.style.overflow = oldOverflow; opener?.focus(); });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.altKey && !e.isComposing) { e.preventDefault(); dialog.open ? dialog.close() : open(); } });
  input.addEventListener('input',render);
  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (visible.length) select((selected + (e.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length); }
    if (e.key === 'Enter' && visible[selected]) { e.preventDefault(); void activate(visible[selected]); }
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button => button.addEventListener('click', () => { kind = button.dataset.kind!; dialog.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed',String(b === button))); render(); input.focus(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-need]').forEach(button => button.addEventListener('click', () => { input.value = ({ 'Repérer une arnaque':'arnaque', 'Sécuriser mes comptes':'mot de passe', 'Protéger mes photos':'sauvegarde', 'Accompagner mes enfants':'enfants' } as Record<string,string>)[button.dataset.need!]; render(); input.focus(); }));
}
