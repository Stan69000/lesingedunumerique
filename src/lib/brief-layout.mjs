import { marked } from 'marked';

// Découpe le Markdown d'un décryptage d'Octet en parties mises en page.
// Le contrat d'écriture ne change pas (voir docs/briefs.md) : on reconnaît
// les conventions déjà suivies par chaque édition — « ## 1. Nom », la ligne
// « **Statut : …** » et les quatre rubriques en gras. Ce qui n'est pas
// reconnu reste affiché tel quel, jamais perdu.

const BLOCKS = [
  { kind: 'trap', label: 'Le piège', pattern: /^Le piège$/i },
  { kind: 'why', label: 'Pourquoi ça marche', pattern: /^Pourquoi ça marche$/i },
  { kind: 'alert', label: 'Ce qui doit alerter', pattern: /^Ce qui doit alerter$/i },
  { kind: 'reflex', label: 'Le réflexe d’Octet', pattern: /^Le réflexe d[’']Octet$/i },
  // Message type reconstitué, affiché en bulle : toujours fictif.
  { kind: 'example', label: 'Exemple de message (fictif)', pattern: /^Exemple de message \(fictif\)$/i },
];

const render = (markdown) => (markdown.trim() ? marked.parse(markdown.trim(), { async: false }) : '');
const renderInline = (markdown) => marked.parseInline(markdown.trim(), { async: false });

const paragraphs = (markdown) => markdown.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** « fiche officielle actualisée le 4 novembre ; technique déjà connue. » → deux étiquettes. */
export function statusTags(status) {
  return status.replace(/\.\s*$/, '').split(/\s*;\s*/).map((tag) => capitalize(tag.trim())).filter(Boolean);
}

function parseScam(number, title, markdown) {
  const scam = { number, title, status: [], blocks: [], notesHtml: '' };
  const notes = [];
  for (const paragraph of paragraphs(markdown)) {
    const status = paragraph.match(/^\*\*Statut\s*:\s*([\s\S]+?)\*\*$/);
    if (status) { scam.status = statusTags(status[1]); continue; }
    const labelled = paragraph.match(/^\*\*([^*]+?)\.\*\*\s*([\s\S]*)$/);
    const block = labelled && BLOCKS.find(({ pattern }) => pattern.test(labelled[1].trim()));
    if (block && labelled[2].trim()) {
      scam.blocks.push({ kind: block.kind, label: block.label, html: renderInline(labelled[2]) });
      continue;
    }
    notes.push(paragraph);
  }
  scam.notesHtml = render(notes.join('\n\n'));
  return scam;
}

function parseSection(title, markdown) {
  if (/^La phrase à retenir$/i.test(title)) {
    const parts = paragraphs(markdown);
    const index = parts.findIndex((part) => part.startsWith('>'));
    if (index !== -1) {
      const quote = parts[index].split('\n').map((line) => line.replace(/^>\s?/, '')).join(' ');
      const rest = parts.filter((_, i) => i !== index).join('\n\n');
      return { kind: 'retain', title, quoteHtml: renderInline(quote), html: render(rest) };
    }
  }
  if (/^Vous avez déjà /i.test(title)) return { kind: 'trapped', title, html: render(markdown) };
  if (/réflexes d[’']Octet$/i.test(title)) return { kind: 'reflexes', title, html: render(markdown) };
  return { kind: 'generic', title, html: render(markdown) };
}

/**
 * @param {string} body Markdown du brief, sans frontmatter.
 * @returns {{ introHtml: string, scams: object[], sections: object[] }}
 */
export function layoutBrief(body) {
  const chunks = body.split(/^## +/m);
  // La ligne « **Édition du … — France.** Période de veille … » double les
  // pastilles de date de l'en-tête : elle n'est pas répétée.
  const intro = paragraphs(chunks.shift() ?? '').filter((part) => !/^\*\*Édition du /.test(part));
  const layout = { introHtml: render(intro.join('\n\n')), scams: [], sections: [] };
  for (const chunk of chunks) {
    const newline = chunk.indexOf('\n');
    const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    const content = newline === -1 ? '' : chunk.slice(newline + 1);
    const numbered = title.match(/^(\d+)\.\s+(.+)$/);
    // Une arnaque ne suit jamais les sections de clôture : l'ordre est conservé.
    if (numbered && layout.sections.length === 0) layout.scams.push(parseScam(numbered[1], numbered[2], content));
    else layout.sections.push(parseSection(title, content));
  }
  return layout;
}

/**
 * Associe au plus une planche à chaque arnaque, d'après les mots de son
 * identifiant, sans proposer deux fois la même planche dans une édition.
 * @param {string[]} scamIds
 * @param {{ bd: string, keywords: string[] }[]} rules dans l'ordre de préférence
 * @returns {(string | null)[]}
 */
export function matchBd(scamIds, rules) {
  const used = new Set();
  return scamIds.map((id) => {
    const words = new Set(id.split('-'));
    const rule = rules.find(({ bd, keywords }) => !used.has(bd) && keywords.some((keyword) => words.has(keyword)));
    if (!rule) return null;
    used.add(rule.bd);
    return rule.bd;
  });
}
