import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let created;
try {
  const [input, filename, ...extra] = process.argv.slice(2);
  if (!input || !filename || extra.length || !/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename)) {
    throw new Error('Usage : npm run brief:add -- /chemin/brief.md AAAA-MM-JJ-sujet.md');
  }
  const date = filename.slice(0, 10);
  if (new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Date du nom de fichier invalide.');
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  if (!branch || ['main', 'master'].includes(branch)) throw new Error('Utilisez une branche dédiée avant cet import.');
  const content = readFileSync(resolve(input), 'utf8');
  if (!/^---\r?\n[\s\S]+?\r?\n---\r?\n\s*\S/.test(content)) throw new Error('Métadonnées YAML et corps Markdown non vide requis.');
  const target = resolve(root, 'src/content/briefs', filename);
  writeFileSync(target, content, { flag: 'wx' });
  created = target;
  const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (build.error || build.status !== 0) throw new Error('Build refusé : le fichier importé est retiré. Corrigez le fichier source et réessayez.');
  console.log(`Brief validé : src/content/briefs/${filename}\nRelisez le contenu, puis committez sur ${branch} et ouvrez une PR.`);
} catch (error) {
  if (created) unlinkSync(created);
  console.error(error.message);
  process.exitCode = 1;
}
