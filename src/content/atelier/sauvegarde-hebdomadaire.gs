/**
 * L'atelier d'Octet — Une sauvegarde automatique de vos tableaux chaque semaine
 * https://lesingedunumerique.fr/outils/atelier/sauvegarde-hebdomadaire/
 *
 * Script autonome : à créer depuis https://script.google.com (Nouveau projet).
 * Ne modifiez que le bloc REGLAGES.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  // Adresses (ou identifiants) des fichiers à sauvegarder, copiées depuis le navigateur.
  fichiers: [
    'https://docs.google.com/spreadsheets/d/XXXXXXXXXXXX/edit',
  ],

  // Adresse (ou identifiant) du dossier Drive qui recevra les sauvegardes.
  dossier: 'https://drive.google.com/drive/folders/XXXXXXXXXXXX',

  // Nombre de sauvegardes hebdomadaires à garder (8 = deux mois).
  garder: 8,

  // Jour et heure de la sauvegarde (heure du fuseau du projet).
  jour: 'SUNDAY', // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY ou SUNDAY
  heure: 3,
};
// ── Fin des réglages ─────────────────────────────────────────

const PREFIXE = 'Sauvegarde ';

/** Copie chaque fichier dans un sous-dossier daté, puis range les plus anciennes. */
function sauvegarder() {
  const racine = DriveApp.getFolderById(extraireId_(REGLAGES.dossier));
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const dossierDuJour = racine.createFolder(PREFIXE + date);

  const echecs = [];
  for (const adresse of REGLAGES.fichiers) {
    try {
      const fichier = DriveApp.getFileById(extraireId_(adresse));
      fichier.makeCopy(fichier.getName(), dossierDuJour);
    } catch (erreur) {
      echecs.push(`${adresse} : ${erreur.message}`);
    }
  }

  const misALaCorbeille = nettoyer_(racine);
  console.log(`Sauvegarde ${date} : ${REGLAGES.fichiers.length - echecs.length} fichier(s) copié(s), ${misALaCorbeille} ancienne(s) sauvegarde(s) mise(s) à la corbeille.`);
  if (echecs.length) {
    // Faire échouer l'exécution : Google prévient alors par mail.
    throw new Error(`Certains fichiers n’ont pas été sauvegardés :\n${echecs.join('\n')}`);
  }
}

/** Installe la sauvegarde hebdomadaire. Sans doublon. */
function installer() {
  const jour = ScriptApp.WeekDay[REGLAGES.jour];
  if (!jour) throw new Error(`Jour « ${REGLAGES.jour} » inconnu : utilisez MONDAY, TUESDAY… ou SUNDAY.`);
  desinstaller();
  ScriptApp.newTrigger('sauvegarder').timeBased().onWeekDay(jour).atHour(REGLAGES.heure).create();
  console.log(`C’est prêt : sauvegarde chaque semaine (${REGLAGES.jour}) vers ${REGLAGES.heure} h.`);
}

/** Arrête les sauvegardes automatiques. Les sauvegardes existantes restent dans Drive. */
function desinstaller() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sauvegarder')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ── Mécanique interne ───────────────────────────────────────

/** Accepte une adresse complète ou un identifiant seul. */
function extraireId_(adresse) {
  const texte = String(adresse).trim();
  const trouve = texte.match(/\/(?:d|folders)\/([\w-]{10,})/) || texte.match(/[?&]id=([\w-]{10,})/);
  if (trouve) return trouve[1];
  if (/^[\w-]{10,}$/.test(texte)) return texte;
  throw new Error(`Impossible de lire un identifiant Drive dans « ${texte} ».`);
}

/** Met à la corbeille les sauvegardes au-delà de REGLAGES.garder (récupérables 30 jours). */
function nettoyer_(racine) {
  const sauvegardes = [];
  const dossiers = racine.getFolders();
  while (dossiers.hasNext()) {
    const dossier = dossiers.next();
    if (/^Sauvegarde \d{4}-\d{2}-\d{2}/.test(dossier.getName())) sauvegardes.push(dossier);
  }
  sauvegardes.sort((a, b) => b.getName().localeCompare(a.getName())); // la plus récente d'abord
  const enTrop = sauvegardes.slice(Math.max(1, REGLAGES.garder));
  enTrop.forEach((dossier) => dossier.setTrashed(true));
  return enTrop.length;
}
