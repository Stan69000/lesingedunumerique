/**
 * @OnlyCurrentDoc
 *
 * L'atelier d'Octet — Relancer les cotisations à échéance
 * https://lesingedunumerique.fr/outils/atelier/relance-cotisations/
 *
 * À coller dans le tableau des adhérents (Extensions > Apps Script).
 * Onglet « Adhérents » : Email, Prénom, Fin d'adhésion, Dernière relance,
 * et une colonne facultative « Pas de relance ». Ne modifiez que le bloc REGLAGES.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  onglet: 'Adhérents',
  colonneEmail: 'Email',
  colonnePrenom: 'Prénom',
  colonneFin: "Fin d'adhésion",
  colonneRelance: 'Dernière relance',
  colonneRefus: 'Pas de relance', // facultative : case cochée = aucune relance

  // Première relance : ce nombre de jours avant l'échéance.
  joursAvant: 15,
  // Seconde relance : ce nombre de jours après l'échéance.
  joursApres: 7,
  // Au-delà de ce nombre de jours après l'échéance, on n'écrit plus.
  oublierApres: 60,

  nomAsso: 'Notre association',
  // Lien vers la page de renouvellement (HelloAsso…). Vide : la ligne {lien} disparaît.
  lienRenouvellement: '',

  // {prenom}, {fin}, {lien} et {asso} sont remplacés automatiquement.
  objetAvant: 'Votre adhésion arrive à échéance le {fin}',
  messageAvant: [
    'Bonjour {prenom},',
    '',
    'Votre adhésion à {asso} arrive à échéance le {fin}.',
    'Pour la renouveler : {lien}',
    '',
    'Merci pour votre soutien !',
    'L’équipe de {asso}',
    '',
    'Vous ne souhaitez plus recevoir ces rappels ? Répondez simplement « STOP » à ce message.',
  ].join('\n'),
  objetApres: 'Votre adhésion a pris fin le {fin}',
  messageApres: [
    'Bonjour {prenom},',
    '',
    'Votre adhésion à {asso} a pris fin le {fin}. Nous serions heureux de vous compter encore parmi nous.',
    'Pour la renouveler : {lien}',
    '',
    'Si vous avez déjà renouvelé, merci et ne tenez pas compte de ce message.',
    'L’équipe de {asso}',
    '',
    'Vous ne souhaitez plus recevoir ces rappels ? Répondez simplement « STOP » à ce message.',
  ].join('\n'),

  repondreA: '',
  adresseTest: '', // votre adresse, pour testerRelance
  heure: 9, // heure du passage quotidien
};
// ── Fin des réglages ─────────────────────────────────────────

/** Lancée chaque jour par le déclencheur : envoie les relances dues. */
function relancer() {
  const { feuille, colonnes, lignes } = lireAdherents_();
  const aujourdhui = new Date();
  let quota = MailApp.getRemainingDailyQuota();
  let envoyees = 0;
  let enAttente = 0;
  const erreurs = [];

  lignes.forEach((ligne, k) => {
    const email = String(ligne[colonnes.email]).trim();
    const fin = ligne[colonnes.fin];
    if (!email || !(fin instanceof Date) || refuse_(ligne, colonnes)) return;
    const palier = palierARelancer_(fin, aujourdhui, ligne[colonnes.relance], REGLAGES);
    if (!palier) return;
    if (quota < 1) {
      enAttente++;
      return;
    }
    try {
      MailApp.sendEmail(composer_(email, palier, String(ligne[colonnes.prenom] || '').trim(), fin));
      feuille.getRange(k + 2, colonnes.relance + 1).setValue(marqueur_(palier, fin));
      quota--;
      envoyees++;
    } catch (erreur) {
      erreurs.push(`Ligne ${k + 2} (${email}) : ${erreur.message}`);
    }
  });

  console.log(`${envoyees} relance(s) envoyée(s).`);
  if (enAttente) console.warn(`Limite quotidienne atteinte : ${enAttente} relance(s) partiront demain.`);
  if (erreurs.length) {
    // Faire échouer l'exécution : Google prévient alors par mail.
    throw new Error(`Relances non envoyées :\n${erreurs.join('\n')}`);
  }
}

/** Affiche dans le journal qui serait relancé aujourd'hui, sans rien envoyer. */
function simulerRelances() {
  const { colonnes, lignes } = lireAdherents_();
  const aujourdhui = new Date();
  const prevues = [];
  lignes.forEach((ligne, k) => {
    const fin = ligne[colonnes.fin];
    if (!String(ligne[colonnes.email]).trim() || !(fin instanceof Date) || refuse_(ligne, colonnes)) return;
    const palier = palierARelancer_(fin, aujourdhui, ligne[colonnes.relance], REGLAGES);
    if (palier) prevues.push(`Ligne ${k + 2} : ${ligne[colonnes.email]} (relance ${palier} l’échéance du ${formatJour_(fin)})`);
  });
  console.log(prevues.length ? `Relances prévues aujourd’hui :\n${prevues.join('\n')}` : 'Aucune relance prévue aujourd’hui.');
}

/** Envoie les deux messages à votre adresse, pour relire le texte. */
function testerRelance() {
  if (!REGLAGES.adresseTest) throw new Error('Indiquez votre adresse dans REGLAGES.adresseTest, puis relancez.');
  const fin = new Date();
  MailApp.sendEmail(composer_(REGLAGES.adresseTest, 'avant', 'Camille', fin));
  MailApp.sendEmail(composer_(REGLAGES.adresseTest, 'après', 'Camille', fin));
  console.log(`Deux messages d’essai envoyés à ${REGLAGES.adresseTest}.`);
}

/** Installe le passage quotidien. Sans doublon. */
function installer() {
  desinstaller();
  ScriptApp.newTrigger('relancer').timeBased().everyDays(1).atHour(REGLAGES.heure).create();
  console.log(`C’est prêt : les relances partiront chaque jour vers ${REGLAGES.heure} h.`);
}

/** Retire le passage quotidien : plus aucune relance ne partira. */
function desinstaller() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'relancer')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ── Mécanique interne ───────────────────────────────────────

function lireAdherents_() {
  const feuille = SpreadsheetApp.getActive().getSheetByName(REGLAGES.onglet);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.onglet} » introuvable.`);
  const [entetes, ...lignes] = feuille.getDataRange().getValues();
  const titres = entetes.map((titre) => String(titre).trim());
  const position = (nom) => {
    const i = titres.indexOf(nom);
    if (i === -1) throw new Error(`Colonne « ${nom} » introuvable en ligne 1 de l’onglet « ${REGLAGES.onglet} ».`);
    return i;
  };
  const colonnes = {
    email: position(REGLAGES.colonneEmail),
    prenom: position(REGLAGES.colonnePrenom),
    fin: position(REGLAGES.colonneFin),
    relance: position(REGLAGES.colonneRelance),
    refus: titres.indexOf(REGLAGES.colonneRefus), // -1 si la colonne n'existe pas
  };
  return { feuille, colonnes, lignes };
}

function refuse_(ligne, colonnes) {
  if (colonnes.refus === -1) return false;
  const valeur = ligne[colonnes.refus];
  return valeur === true || /^(oui|x|stop)$/i.test(String(valeur).trim());
}

/** Nombre de jours entre deux dates, sans tenir compte des heures. */
function ecartEnJours_(de, a) {
  const jour = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((jour(a) - jour(de)) / 86400000);
}

function formatJour_(d) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Ce que le script note dans « Dernière relance » : le palier et l'échéance concernée. */
function marqueur_(palier, fin) {
  return `${palier} ${formatJour_(fin)}`;
}

/**
 * Le palier à relancer aujourd'hui (« avant » ou « après »), ou null.
 * Une seule relance par palier et par échéance : quand la date de fin change
 * (renouvellement), les relances repartent pour la nouvelle échéance.
 */
function palierARelancer_(fin, aujourdhui, derniereRelance, reglages) {
  const jours = ecartEnJours_(aujourdhui, fin);
  let palier = null;
  if (jours >= 0 && jours <= reglages.joursAvant) palier = 'avant';
  else if (jours <= -reglages.joursApres && jours >= -reglages.oublierApres) palier = 'après';
  if (!palier) return null;
  const fait = String(derniereRelance || '').trim();
  if (fait === marqueur_(palier, fin) || fait === marqueur_('après', fin)) return null;
  return palier;
}

/** Remplace les {champs} ; une ligne dont le {lien} est vide disparaît. */
function remplir_(modele, valeurs) {
  return modele
    .split('\n')
    .filter((ligne) => !(ligne.includes('{lien}') && !valeurs.lien))
    .join('\n')
    .replace(/\{(\w+)\}/g, (tout, nom) => (Object.prototype.hasOwnProperty.call(valeurs, nom) ? valeurs[nom] : tout))
    .replace(/ +,/g, ','); // « Bonjour , » devient « Bonjour, » quand le prénom manque
}

function composer_(email, palier, prenom, fin) {
  const valeurs = { prenom, fin: formatJour_(fin), lien: REGLAGES.lienRenouvellement, asso: REGLAGES.nomAsso };
  const avant = palier === 'avant';
  const options = {
    to: email,
    subject: remplir_(avant ? REGLAGES.objetAvant : REGLAGES.objetApres, valeurs),
    body: remplir_(avant ? REGLAGES.messageAvant : REGLAGES.messageApres, valeurs),
    name: REGLAGES.nomAsso,
  };
  if (REGLAGES.repondreA) options.replyTo = REGLAGES.repondreA;
  return options;
}
