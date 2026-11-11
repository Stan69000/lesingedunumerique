// L'atelier d'Octet : les scripts publiés doivent au moins être du JavaScript
// valide, et leur logique pure (sans service Google) doit tenir ses promesses.
// Le comportement réel (Gmail, Agenda, Drive) se vérifie à la main sur un
// compte de test : c'est ce que trace le champ `verifieLe` des fiches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = fileURLToPath(new URL('../src/content/atelier/', import.meta.url));
const scripts = readdirSync(dir).filter((f) => f.endsWith('.gs'));
const fiches = readdirSync(dir).filter((f) => f.endsWith('.md'));
const read = (f) => readFileSync(join(dir, f), 'utf8');

/** Charge un script dans un bac à sable et renvoie les fonctions demandées. */
function charger(fichier, noms) {
  // Date vient d'ici : sinon `instanceof Date` échoue d'un bac à sable à l'autre.
  const context = vm.createContext({ console, Date });
  return vm.runInContext(`${read(fichier)}\n;({ ${noms.join(', ')} })`, context);
}

test('chaque script est du JavaScript valide', () => {
  assert.ok(scripts.length > 0);
  for (const f of scripts) assert.doesNotThrow(() => new vm.Script(read(f), { filename: f }), f);
});

test('chaque script a sa fiche, avec le marqueur à la bonne place', () => {
  for (const f of scripts) {
    const md = f.replace(/\.gs$/, '.md');
    assert.ok(existsSync(join(dir, md)), `${f} sans fiche`);
    assert.equal(read(md).split('<!-- script -->').length, 2, `${md} : un et un seul marqueur <!-- script -->`);
  }
  for (const md of fiches) {
    if (read(md).includes('<!-- script -->')) assert.ok(existsSync(join(dir, md.replace(/\.md$/, '.gs'))), `${md} annonce un script absent`);
  }
});

test('chaque script renvoie à sa propre fiche', () => {
  for (const f of scripts) {
    assert.ok(read(f).includes(`/outils/atelier/${f.replace(/\.gs$/, '')}/`), `${f} : lien vers la fiche manquant ou faux`);
  }
});

test('les scripts liés à un tableau se limitent à ce tableau', () => {
  for (const f of scripts) {
    if (read(f).includes('SpreadsheetApp.getActive()')) assert.match(read(f), /@OnlyCurrentDoc/, f);
  }
});

test('bienvenue : prénom absent sans « Bonjour , »', () => {
  const { remplir_ } = charger('bienvenue-adherents.gs', ['remplir_']);
  assert.equal(remplir_('Bonjour {prenom}, bienvenue à {asso}', 'Camille'), 'Bonjour Camille, bienvenue à Notre association');
  assert.equal(remplir_('Bonjour {prenom},', ''), 'Bonjour,');
});

test('publipostage : champs remplis, inconnus laissés visibles', () => {
  const { remplir_, champs_ } = charger('publipostage.gs', ['remplir_', 'champs_']);
  assert.equal(remplir_('Bonjour {{Prénom}}, {{ Créneau }}', { 'Prénom': 'Dominique', 'Créneau': 'samedi' }), 'Bonjour Dominique, samedi');
  assert.equal(remplir_('{{toString}} {{Absent}}', {}), '{{toString}} {{Absent}}');
  assert.deepEqual([...champs_('Objet {{A}}\n{{ B c }} et {{A}}')], ['A', 'B c', 'A']);
});

test('agenda : journée entière, durée par défaut et dates à l’envers', () => {
  const { lireCreneau_ } = charger('evenements-agenda.gs', ['lireCreneau_']);
  const jour = lireCreneau_(new Date(2027, 5, 6), '');
  assert.equal(jour.journee, true);
  assert.equal(jour.fin.getDate(), 7, 'la fin d’une journée entière est le lendemain');
  const plusieursJours = lireCreneau_(new Date(2027, 5, 6), new Date(2027, 5, 8));
  assert.equal(plusieursJours.fin.getDate(), 9);
  const reunion = lireCreneau_(new Date(2027, 2, 14, 14, 0), '');
  assert.equal(reunion.journee, false);
  assert.equal(reunion.fin.getHours(), 16, 'deux heures par défaut');
  assert.throws(() => lireCreneau_(new Date(2027, 2, 14, 14), new Date(2027, 2, 14, 13)), /avant le début/);
  assert.throws(() => lireCreneau_('demain', ''), /date de début/);
});

test('sauvegarde : identifiants lus depuis une adresse ou tels quels', () => {
  const { extraireId_ } = charger('sauvegarde-hebdomadaire.gs', ['extraireId_']);
  const id = '1AbC_dEf-GhIjKlMnOp';
  assert.equal(extraireId_(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`), id);
  assert.equal(extraireId_(`https://drive.google.com/drive/folders/${id}?usp=sharing`), id);
  assert.equal(extraireId_(`https://drive.google.com/open?id=${id}`), id);
  assert.equal(extraireId_(` ${id} `), id);
  assert.throws(() => extraireId_('mon dossier'), /identifiant Drive/);
});
