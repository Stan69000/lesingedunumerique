import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { scoreEntry } from '../src/lib/command-palette.ts';
const entries = JSON.parse(readFileSync(new URL('../dist/recherche.json', import.meta.url), 'utf8'));
const search = (query: string) => entries.map((entry: any) => ({ entry, score: scoreEntry(entry, query) })).filter((result: any) => result.score > 0).sort((a: any,b: any) => b.score - a.score);
test('une situation quotidienne retrouve une ressource directement utile', () => {
 assert.match(search('SMS suspect')[0].entry.title, /faux SMS/i);
 assert.equal(search('mot de passe')[0].entry.title, 'Mot de passe');
 assert(search('protéger mes photos').length > 0);
 assert(search('enfants').some((r: any) => r.entry.type === 'Jeux'));
});
test('accents et fautes légères ne bloquent pas la recherche', () => {
 assert.equal(search('hameconnage')[0].entry.href, search('hameçonnage')[0].entry.href);
 assert(search('authentificatiom').some((r: any) => /authentification/i.test(r.entry.title)));
 assert.equal(search('zzzxxyyqqq').length, 0);
});
test('chaque destination existe et chaque mot pointe vers sa définition', () => {
 for (const entry of entries) {
  const [path, hash] = entry.href.split('#');
  const file = new URL(`../dist${path === '/' ? '/index.html' : `${path.replace(/\/$/,'')}/index.html`}`, import.meta.url);
  assert(existsSync(file), entry.href);
  if (hash) assert(readFileSync(file,'utf8').includes(`id="${hash}"`), entry.href);
 }
});
