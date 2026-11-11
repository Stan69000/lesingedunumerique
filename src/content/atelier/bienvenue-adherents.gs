/**
 * @OnlyCurrentDoc
 *
 * L'atelier d'Octet — Un mail de bienvenue à chaque nouvelle adhésion
 * https://lesingedunumerique.fr/outils/atelier/bienvenue-adherents/
 *
 * À coller dans le tableau qui reçoit les réponses du formulaire
 * (Extensions > Apps Script). Ne modifiez que le bloc REGLAGES.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  // Titres exacts des questions du formulaire (= en-têtes des colonnes).
  colonneEmail: 'Adresse e-mail',
  colonnePrenom: 'Prénom',

  nomAsso: 'Notre association',
  objet: 'Bienvenue parmi nous !',

  // {prenom} et {asso} sont remplacés automatiquement.
  message: [
    'Bonjour {prenom},',
    '',
    'Merci pour votre adhésion à {asso} : nous sommes ravis de vous compter parmi nous.',
    '',
    'Vous recevrez bientôt les informations sur nos prochains rendez-vous.',
    'Une question ? Répondez simplement à ce message.',
    '',
    'À très vite,',
    'L’équipe de {asso}',
  ].join('\n'),

  // Adresse qui recevra les réponses (laisser vide pour le compte qui envoie).
  repondreA: '',

  // Votre adresse, pour la fonction testerBienvenue.
  adresseTest: '',
};
// ── Fin des réglages ─────────────────────────────────────────

/** Lancée par le déclencheur à chaque réponse au formulaire. */
function envoyerBienvenue(e) {
  if (!e || !e.namedValues) {
    throw new Error('Cette fonction se lance toute seule à chaque réponse. Pour essayer, lancez plutôt « testerBienvenue ».');
  }
  const email = lireReponse_(e.namedValues, REGLAGES.colonneEmail);
  const prenom = lireReponse_(e.namedValues, REGLAGES.colonnePrenom);
  if (!email) {
    console.warn(`Réponse sans adresse dans la colonne « ${REGLAGES.colonneEmail} » : aucun mail envoyé.`);
    return;
  }
  envoyer_(email, prenom);
}

/** Envoie le mail de bienvenue à votre propre adresse, pour vérifier le texte. */
function testerBienvenue() {
  if (!REGLAGES.adresseTest) {
    throw new Error('Indiquez votre adresse dans REGLAGES.adresseTest, puis relancez.');
  }
  envoyer_(REGLAGES.adresseTest, 'Camille');
  console.log(`Mail d’essai envoyé à ${REGLAGES.adresseTest}.`);
}

/** Installe le déclencheur « à l'envoi du formulaire ». Sans doublon. */
function installer() {
  const dejaLa = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'envoyerBienvenue');
  if (dejaLa) {
    console.log('Le déclencheur est déjà installé : rien à faire.');
    return;
  }
  ScriptApp.newTrigger('envoyerBienvenue')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
  console.log('C’est prêt : chaque nouvelle adhésion recevra son mail de bienvenue.');
}

/** Retire le déclencheur : plus aucun mail ne partira. */
function desinstaller() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'envoyerBienvenue')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  console.log('Déclencheur retiré.');
}

// ── Mécanique interne ───────────────────────────────────────

function lireReponse_(reponses, colonne) {
  const valeur = reponses[colonne];
  if (valeur === undefined) {
    throw new Error(`Colonne « ${colonne} » introuvable. Vérifiez qu’elle porte exactement ce titre dans le tableau.`);
  }
  return String(valeur[0] || '').trim();
}

function remplir_(modele, prenom) {
  return modele
    .replaceAll('{asso}', REGLAGES.nomAsso)
    .replaceAll('{prenom}', prenom)
    .replace(/ +,/g, ','); // « Bonjour , » devient « Bonjour, » quand le prénom manque
}

function envoyer_(email, prenom) {
  const options = {
    to: email,
    subject: remplir_(REGLAGES.objet, prenom),
    body: remplir_(REGLAGES.message, prenom),
    name: REGLAGES.nomAsso,
  };
  if (REGLAGES.repondreA) options.replyTo = REGLAGES.repondreA;
  MailApp.sendEmail(options);
}
