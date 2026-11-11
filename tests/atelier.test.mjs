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

// Exception admise : un commentaire « atelier: accès complet assumé — <raison> »,
// quand le script doit ouvrir d'autres fichiers (formulaire, modèle Docs, Drive).
const EXCEPTION = /^\s*(?:\/\/|\*)\s*atelier: accès complet assumé — .{20,}/m;

test('les scripts liés à un tableau se limitent à ce tableau, ou disent pourquoi', () => {
  for (const f of scripts) {
    const code = read(f);
    if (!code.includes('SpreadsheetApp.getActive()')) continue;
    // L'annotation seule sur sa ligne : le mot peut aussi apparaître dans une explication.
    const restreint = /^\s*\*\s*@OnlyCurrentDoc\s*$/m.test(code);
    const exception = EXCEPTION.test(code);
    assert.ok(restreint !== exception, `${f} : @OnlyCurrentDoc, ou une exception commentée avec sa raison (pas les deux)`);
  }
});

test('créneaux et rappels cohabitent dans un même projet Apps Script', () => {
  // Apps Script place tous les fichiers d'un projet dans la même portée :
  // deux `const REGLAGES` ou deux `onOpen` y seraient une erreur.
  assert.doesNotThrow(() => new vm.Script(`${read('creneaux-benevoles.gs')}\n${read('rappel-veille-benevoles.gs')}`));
  const fonctions = (f) => [...read(f).matchAll(/^function (\w+)/gm)].map((m) => m[1]);
  const communes = fonctions('creneaux-benevoles.gs').filter((nom) => fonctions('rappel-veille-benevoles.gs').includes(nom));
  assert.deepEqual(communes, []);
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

test('relance : un palier avant, un après, jamais deux fois, et oubli des anciens', () => {
  const { palierARelancer_, marqueur_, remplir_ } = charger('relance-cotisations.gs', ['palierARelancer_', 'marqueur_', 'remplir_']);
  const r = { joursAvant: 15, joursApres: 7, oublierApres: 60 };
  const fin = new Date(2027, 0, 31);
  const jour = (j) => new Date(2027, 0, 31 + j, 9, 30);
  assert.equal(palierARelancer_(fin, jour(-20), '', r), null, 'trop tôt');
  assert.equal(palierARelancer_(fin, jour(-15), '', r), 'avant');
  assert.equal(palierARelancer_(fin, jour(0), '', r), 'avant', 'le jour même');
  assert.equal(palierARelancer_(fin, jour(-10), marqueur_('avant', fin), r), null, 'déjà relancé pour cette échéance');
  assert.equal(palierARelancer_(fin, jour(3), marqueur_('avant', fin), r), null, 'entre les deux paliers');
  assert.equal(palierARelancer_(fin, jour(7), marqueur_('avant', fin), r), 'après');
  assert.equal(palierARelancer_(fin, jour(8), marqueur_('après', fin), r), null);
  assert.equal(palierARelancer_(fin, jour(61), '', r), null, 'ancien adhérent oublié');
  const ancienne = new Date(2026, 0, 31);
  assert.equal(palierARelancer_(fin, jour(-10), marqueur_('après', ancienne), r), 'avant', 'renouvelé : nouvelle échéance');
  assert.equal(marqueur_('avant', fin), 'avant 31/01/2027');
  assert.equal(remplir_('Bonjour {prenom},\nPour renouveler : {lien}\nFin', { prenom: '', lien: '' }), 'Bonjour,\nFin');
  assert.equal(remplir_('Lien : {lien}', { lien: 'https://exemple.fr' }), 'Lien : https://exemple.fr');
});

test('carte : champs du modèle, inconnus repérés, titres échappés', () => {
  const { champsInconnus_, remplir_, valeursDeLaLigne_, echapper_ } = charger('carte-adherent-pdf.gs', ['champsInconnus_', 'remplir_', 'valeursDeLaLigne_', 'echapper_']);
  const titres = ['Prénom', 'Nom', "Fin d'adhésion", 'Carte'];
  assert.deepEqual([...champsInconnus_('{{Prénom}} {{ Nom }} {{Prenom}} {{Prenom}}', titres)], ['Prenom']);
  const valeurs = valeursDeLaLigne_(titres, ['Camille', 'Martin', new Date(2027, 0, 31), '']);
  assert.equal(remplir_("Carte {{Prénom}} {{Nom}}, valable jusqu'au {{Fin d'adhésion}}", valeurs), "Carte Camille Martin, valable jusqu'au 31/01/2027");
  assert.ok(new RegExp(echapper_('Montant (€) [2027]')).test('Montant (€) [2027]'));
});

test('créneaux : premier arrivé, premier servi, puis liste d’attente', () => {
  const { repartir_, choixDisponibles_ } = charger('creneaux-benevoles.gs', ['repartir_', 'choixDisponibles_']);
  const capacites = [{ nom: 'Buvette', places: 2 }, { nom: 'Rangement', places: 1 }];
  const h = (min) => new Date(2027, 5, 1, 10, min);
  const { statuts, restantes } = repartir_([
    { creneau: 'Buvette', horodatage: h(3) },
    { creneau: 'Buvette', horodatage: h(1) },
    { creneau: 'Buvette', horodatage: h(2) }, // arrivée deuxième : la dernière place
    { creneau: 'Rangement', horodatage: h(4) },
    { creneau: 'Démontage', horodatage: h(5) },
    { creneau: '', horodatage: h(6) },
  ], capacites);
  assert.deepEqual([...statuts], ["Liste d'attente", 'Confirmé', 'Confirmé', 'Confirmé', 'Créneau inconnu', '']);
  assert.equal(restantes.Buvette, 0);
  assert.equal(restantes.Rangement, 0);
  const libres = choixDisponibles_(capacites, { Buvette: 1, Rangement: 0 });
  assert.deepEqual([...libres.libres], ['Buvette']);
  assert.equal(libres.aide, 'Places restantes : Buvette (1)');
  assert.deepEqual([...choixDisponibles_(capacites, restantes).libres], []);
});

test('rappels : seulement demain, confirmés, et une seule fois', () => {
  const { rappelsDuLendemain_, dateLongue_ } = charger('rappel-veille-benevoles.gs', ['rappelsDuLendemain_', 'dateLongue_']);
  const creneaux = {
    Buvette: { date: new Date(2027, 5, 13) },
    Rangement: { date: new Date(2027, 5, 14) },
  };
  const veille = new Date(2027, 5, 12, 18, 0);
  const inscriptions = [
    { email: 'a@exemple.fr', creneau: 'Buvette', statut: 'Confirmé', rappel: '' },
    { email: 'b@exemple.fr', creneau: 'Buvette', statut: "Liste d'attente", rappel: '' },
    { email: 'c@exemple.fr', creneau: 'Buvette', statut: 'Confirmé', rappel: new Date(2027, 5, 12, 18) },
    { email: 'd@exemple.fr', creneau: 'Rangement', statut: 'Confirmé', rappel: '' },
    { email: '', creneau: 'Buvette', statut: 'Confirmé', rappel: '' },
    { email: 'e@exemple.fr', creneau: 'Buvette', statut: '', rappel: '' },
    { email: 'f@exemple.fr', creneau: 'Inconnu', statut: '', rappel: '' },
  ];
  assert.deepEqual([...rappelsDuLendemain_(inscriptions, creneaux, veille)], [0, 5]);
  assert.equal(dateLongue_(new Date(2027, 5, 13)), 'dimanche 13 juin');
  assert.equal(dateLongue_(new Date(2027, 4, 1)), 'samedi 1er mai');
});
