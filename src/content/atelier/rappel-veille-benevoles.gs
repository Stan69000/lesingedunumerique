/**
 * L'atelier d'Octet — Un rappel la veille à chaque bénévole inscrit
 * https://lesingedunumerique.fr/outils/atelier/rappel-veille-benevoles/
 *
 * Complète la recette « Des créneaux bénévoles qui se ferment quand ils sont
 * pleins » : à coller dans un NOUVEAU fichier du même projet Apps Script
 * (Fichiers > + > Script). Les noms (RAPPELS, envoyerRappels…) ont été choisis
 * pour ne pas entrer en conflit avec ceux de l'autre recette.
 * Ne modifiez que le bloc RAPPELS.
 *
 * atelier: accès complet assumé — ce script partage le projet de la recette des
 * créneaux, qui doit modifier le formulaire : @OnlyCurrentDoc, valable pour tout
 * le projet, la bloquerait. Seul, il se contente de ce tableau.
 */

// ── Réglages ─────────────────────────────────────────────────
const RAPPELS = {
  ongletCreneaux: 'Créneaux', // colonnes Créneau, Date, Début, Fin, Lieu
  ongletReponses: 'Réponses au formulaire 1',
  colonneEmail: 'Adresse e-mail',
  colonnePrenom: 'Prénom',
  colonneCreneau: 'Créneau',
  colonneStatut: 'Statut', // facultative : seuls les « Confirmé » sont prévenus
  colonneRappel: 'Rappel envoyé', // créée par le script si elle manque

  nomAsso: 'Notre association',
  heure: 18, // heure d'envoi, la veille

  // {prenom}, {creneau}, {date}, {debut}, {fin}, {lieu} et {asso} sont remplacés.
  objet: 'Rappel : demain, {creneau}',
  message: [
    'Bonjour {prenom},',
    '',
    'Merci encore pour votre aide ! Petit rappel pour demain :',
    '',
    '{creneau}',
    '{date}, de {debut} à {fin}',
    'Lieu : {lieu}',
    '',
    'Un empêchement ? Répondez à ce message pour que nous puissions nous organiser.',
    '',
    'À demain,',
    'L’équipe de {asso}',
  ].join('\n'),

  repondreA: '',
  adresseTest: '', // votre adresse, pour testerRappel
};
// ── Fin des réglages ─────────────────────────────────────────

/** Lancée chaque jour par le déclencheur : prévient les inscrits du lendemain. */
function envoyerRappels() {
  const classeur = SpreadsheetApp.getActive();
  const creneaux = lireAgendaCreneaux_(classeur);
  const { feuille, colonnes, inscriptions } = lireInscritsRappel_(classeur);
  const aPrevenir = rappelsDuLendemain_(inscriptions, creneaux, new Date());

  let quota = MailApp.getRemainingDailyQuota();
  let envoyes = 0;
  const erreurs = [];
  for (const i of aPrevenir) {
    if (quota < 1) {
      erreurs.push(`Limite quotidienne de mails atteinte : ${aPrevenir.length - envoyes} rappel(s) non envoyé(s).`);
      break;
    }
    const inscription = inscriptions[i];
    try {
      MailApp.sendEmail(composerRappel_(inscription.email, inscription.prenom, inscription.creneau, creneaux[inscription.creneau]));
      feuille.getRange(i + 2, colonnes.rappel + 1).setValue(new Date());
      quota--;
      envoyes++;
    } catch (erreur) {
      erreurs.push(`Ligne ${i + 2} (${inscription.email}) : ${erreur.message}`);
    }
  }
  console.log(`${envoyes} rappel(s) envoyé(s).`);
  if (erreurs.length) throw new Error(erreurs.join('\n')); // Google prévient alors par mail
}

/** Envoie le rappel du premier créneau à votre adresse, pour relire le texte. */
function testerRappel() {
  if (!RAPPELS.adresseTest) throw new Error('Indiquez votre adresse dans RAPPELS.adresseTest, puis relancez.');
  const creneaux = lireAgendaCreneaux_(SpreadsheetApp.getActive());
  const premier = Object.keys(creneaux)[0];
  if (!premier) throw new Error(`Aucun créneau dans l’onglet « ${RAPPELS.ongletCreneaux} ».`);
  MailApp.sendEmail(composerRappel_(RAPPELS.adresseTest, 'Camille', premier, creneaux[premier]));
  console.log(`Rappel d’essai envoyé à ${RAPPELS.adresseTest}.`);
}

/** Installe l'envoi quotidien. Sans doublon. */
function installerRappels() {
  desinstallerRappels();
  ScriptApp.newTrigger('envoyerRappels').timeBased().everyDays(1).atHour(RAPPELS.heure).create();
  console.log(`C’est prêt : chaque jour vers ${RAPPELS.heure} h, les inscrits du lendemain recevront leur rappel.`);
}

/** Arrête les rappels. */
function desinstallerRappels() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'envoyerRappels')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ── Mécanique interne ───────────────────────────────────────

/** Les créneaux par nom : date (vraie date) et heures/lieu tels qu'affichés. */
function lireAgendaCreneaux_(classeur) {
  const feuille = classeur.getSheetByName(RAPPELS.ongletCreneaux);
  if (!feuille) throw new Error(`Onglet « ${RAPPELS.ongletCreneaux} » introuvable.`);
  const plage = feuille.getDataRange();
  const valeurs = plage.getValues();
  // Les heures seules se lisent mal en Apps Script (décalage de fuseau
  // historique) : on prend le texte affiché dans la case.
  const affichees = plage.getDisplayValues();
  const titres = valeurs[0].map((t) => String(t).trim());
  const position = (nom) => {
    const i = titres.indexOf(nom);
    if (i === -1) throw new Error(`Colonne « ${nom} » introuvable dans l’onglet « ${RAPPELS.ongletCreneaux} ».`);
    return i;
  };
  const c = { nom: position('Créneau'), date: position('Date'), debut: position('Début'), fin: position('Fin'), lieu: position('Lieu') };
  const creneaux = {};
  for (let k = 1; k < valeurs.length; k++) {
    const nom = String(valeurs[k][c.nom]).trim();
    if (!nom) continue;
    creneaux[nom] = { date: valeurs[k][c.date], debut: affichees[k][c.debut], fin: affichees[k][c.fin], lieu: affichees[k][c.lieu] };
  }
  return creneaux;
}

function lireInscritsRappel_(classeur) {
  const feuille = classeur.getSheetByName(RAPPELS.ongletReponses);
  if (!feuille) throw new Error(`Onglet « ${RAPPELS.ongletReponses} » introuvable.`);
  const derniereColonne = feuille.getLastColumn();
  const titres = feuille.getRange(1, 1, 1, derniereColonne).getValues()[0].map((t) => String(t).trim());
  const position = (nom) => {
    const i = titres.indexOf(nom);
    if (i === -1) throw new Error(`Colonne « ${nom} » introuvable dans l’onglet « ${RAPPELS.ongletReponses} ».`);
    return i;
  };
  const colonnes = {
    email: position(RAPPELS.colonneEmail),
    prenom: titres.indexOf(RAPPELS.colonnePrenom),
    creneau: position(RAPPELS.colonneCreneau),
    statut: titres.indexOf(RAPPELS.colonneStatut),
    rappel: titres.indexOf(RAPPELS.colonneRappel),
  };
  if (colonnes.rappel === -1) {
    feuille.getRange(1, derniereColonne + 1).setValue(RAPPELS.colonneRappel);
    colonnes.rappel = derniereColonne;
  }
  const nbLignes = feuille.getLastRow() - 1;
  const lignes = nbLignes > 0 ? feuille.getRange(2, 1, nbLignes, Math.max(derniereColonne, colonnes.rappel + 1)).getValues() : [];
  const lire = (ligne, i) => (i === -1 ? '' : ligne[i]);
  const inscriptions = lignes.map((ligne) => ({
    email: String(ligne[colonnes.email]).trim(),
    prenom: String(lire(ligne, colonnes.prenom)).trim(),
    creneau: String(ligne[colonnes.creneau]).trim(),
    statut: String(lire(ligne, colonnes.statut)).trim(),
    rappel: lire(ligne, colonnes.rappel),
  }));
  return { feuille, colonnes, inscriptions };
}

/** Nombre de jours entre deux dates, sans tenir compte des heures. */
function ecartJours_(de, a) {
  const jour = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((jour(a) - jour(de)) / 86400000);
}

/**
 * Les inscriptions à prévenir aujourd'hui : créneau connu, daté de demain,
 * adresse présente, pas en liste d'attente, et jamais prévenues. Fonction pure.
 */
function rappelsDuLendemain_(inscriptions, creneaux, aujourdhui) {
  const indices = [];
  inscriptions.forEach((inscription, i) => {
    if (!inscription.email || inscription.rappel !== '') return;
    if (inscription.statut && inscription.statut !== 'Confirmé') return;
    if (!Object.prototype.hasOwnProperty.call(creneaux, inscription.creneau)) return;
    const date = creneaux[inscription.creneau].date;
    if (date instanceof Date && ecartJours_(aujourdhui, date) === 1) indices.push(i);
  });
  return indices;
}

/** « samedi 13 juin » */
function dateLongue_(d) {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const jour = d.getDate() === 1 ? '1er' : String(d.getDate());
  return `${jours[d.getDay()]} ${jour} ${mois[d.getMonth()]}`;
}

function remplirRappel_(modele, valeurs) {
  return modele
    .replace(/\{(\w+)\}/g, (tout, nom) => (Object.prototype.hasOwnProperty.call(valeurs, nom) ? valeurs[nom] : tout))
    .replace(/ +,/g, ','); // « Bonjour , » devient « Bonjour, » quand le prénom manque
}

function composerRappel_(email, prenom, nomCreneau, creneau) {
  const valeurs = {
    prenom,
    creneau: nomCreneau,
    date: creneau.date instanceof Date ? dateLongue_(creneau.date) : String(creneau.date),
    debut: creneau.debut,
    fin: creneau.fin,
    lieu: creneau.lieu,
    asso: RAPPELS.nomAsso,
  };
  const options = {
    to: email,
    subject: remplirRappel_(RAPPELS.objet, valeurs),
    body: remplirRappel_(RAPPELS.message, valeurs),
    name: RAPPELS.nomAsso,
  };
  if (RAPPELS.repondreA) options.replyTo = RAPPELS.repondreA;
  return options;
}
