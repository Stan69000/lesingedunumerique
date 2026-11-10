import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { layoutBrief, matchBd, statusTags } from '../src/lib/brief-layout.mjs';

const dir = new URL('../src/content/briefs/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const bodyOf = (name) => read(name).split(/^---$/m).slice(2).join('---');
const scamCount = (name) => [...read(name).matchAll(/^  - id: /gm)].length;
const rules = JSON.parse(readFileSync(new URL('../src/data/brief-bd.json', import.meta.url), 'utf8'));

// Le sommaire et les ancres suivent la liste `scams` du frontmatter : chaque
// arnaque déclarée doit avoir sa section « ## N. Nom ».
test('every brief has one card per scam of its frontmatter', () => {
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
    assert.equal(layoutBrief(bodyOf(name)).scams.length, scamCount(name), name);
  }
});

test('the current briefs follow the four headings and the closing sentence', () => {
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
    const layout = layoutBrief(bodyOf(name));
    for (const scam of layout.scams) {
      assert.deepEqual(scam.blocks.map((block) => block.kind), ['trap', 'why', 'alert', 'reflex'], `${name} ${scam.title}`);
    }
    assert.ok(layout.sections.some((section) => section.kind === 'retain' && section.quoteHtml), name);
  }
});

test('nothing outside the known conventions is dropped', () => {
  const layout = layoutBrief([
    'Intro libre.', '', '## 1. Une arnaque', '', '**Statut : rappel.**', '',
    '**Le piège.** Un *piège*.', '', 'Un paragraphe libre avec [un lien](https://example.org).', '',
    '## La phrase à retenir', '', '> Une phrase.', '', 'Une suite.', '',
    '## Vous avez déjà payé ?', '', 'Appelez votre banque.', '', '## Autre chose', '', 'Texte.',
  ].join('\n'));
  assert.match(layout.introHtml, /Intro libre/);
  const [scam] = layout.scams;
  assert.deepEqual(scam.status, ['Rappel']);
  assert.match(scam.blocks[0].html, /<em>piège<\/em>/);
  assert.match(scam.notesHtml, /href="https:\/\/example.org"/);
  assert.deepEqual(layout.sections.map((section) => section.kind), ['retain', 'trapped', 'generic']);
  assert.equal(layout.sections[0].quoteHtml, 'Une phrase.');
  assert.match(layout.sections[0].html, /Une suite/);
});

test('the edition line is not repeated under the header dates', () => {
  const layout = layoutBrief('**Édition du dimanche 8 novembre 2026 — France.** Période de veille.\n\nLe vrai chapeau.\n');
  assert.doesNotMatch(layout.introHtml, /Édition du/);
  assert.match(layout.introHtml, /Le vrai chapeau/);
});

test('status lines become separate tags', () => {
  assert.deepEqual(statusTags('fiche officielle actualisée le 4 novembre ; technique déjà connue.'), ['Fiche officielle actualisée le 4 novembre', 'Technique déjà connue']);
});

test('a comic strip is suggested at most once per edition', () => {
  assert.deepEqual(matchBd(['fausse-amende-antai', 'faux-numero-opposition', 'faux-frais-livraison'], rules), [
    'le-faux-sms-ne-clique-pas-trop-vite', null, 'faux-sites-verifier-l-adresse-avant-de-se-connecter',
  ]);
  assert.deepEqual(matchBd(['inconnu'], rules), [null]);
});

test('every suggested comic strip exists', () => {
  for (const { bd } of rules) readFileSync(new URL(`../src/content/bd/${bd}.md`, import.meta.url));
});
