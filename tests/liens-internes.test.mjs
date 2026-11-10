// Vérifie, sur le site construit (dist/), que les liens internes pointent
// directement vers l'URL finale. Apache redirige /asso vers /asso/ (301) :
// chaque lien sans slash final apparaît dans la Search Console en
// « Page avec redirection ». Lancer après `npm run build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

test('aucun lien interne vers un dossier sans slash final', { skip: !existsSync(dist) && 'dist/ absent' }, () => {
  const fautifs = new Map();
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href, 'https://lesingedunumerique.fr/');
      if (url.hostname !== 'lesingedunumerique.fr') continue;
      const path = url.pathname;
      if (path.endsWith('/') || /\.[a-z0-9]+$/i.test(path)) continue;
      // Un dossier existe dans dist/ : Apache redirigera.
      if (existsSync(join(dist, path, 'index.html'))) {
        fautifs.set(href, file.slice(dist.length));
      }
    }
  }
  assert.deepEqual([...fautifs].map(([href, file]) => `${href} (${file})`), []);
});

test('le sitemap ne liste que des URL avec slash final', { skip: !existsSync(join(dist, 'sitemap.xml')) && 'sitemap absent' }, () => {
  const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0);
  assert.deepEqual(locs.filter((u) => !u.endsWith('/')), []);
  for (const u of locs) {
    const path = new URL(u).pathname;
    assert.ok(existsSync(join(dist, path, 'index.html')) || path === '/', `page absente du build : ${u}`);
  }
});
