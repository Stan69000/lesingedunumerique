/**
 * @OnlyCurrentDoc
 *
 * L'atelier d'Octet — Un mail personnalisé à chaque personne du tableau
 * https://lesingedunumerique.fr/outils/atelier/publipostage/
 *
 * À coller dans le tableau des destinataires (Extensions > Apps Script).
 * Onglet « Message » : l'objet en B1, le texte en B2.
 * Onglet « Destinataires » : une colonne « Email », une colonne « Envoyé le »,
 * et autant d'autres colonnes que vous voulez ({{Prénom}}, {{Créneau}}…).
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  ongletDestinataires: 'Destinataires',
  ongletMessage: 'Message',
  colonneEmail: 'Email',
  colonneEnvoi: 'Envoyé le',

  // Nom affiché comme expéditeur, et adresse qui recevra les réponses.
  // Laisser vide pour garder ceux du compte qui envoie.
  nomExpediteur: '',
  repondreA: '',
};
// ── Fin des réglages ─────────────────────────────────────────

/** Ajoute le menu « 🐒 Octet » à l'ouverture du tableau. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐒 Octet')
    .addItem('Envoyer un essai à moi', 'envoyerEssai')
    .addItem('Envoyer à tous les destinataires', 'envoyerATous')
    .addToUi();
}

/** Envoie le message de la première ligne à une adresse de votre choix. */
function envoyerEssai() {
  const ui = SpreadsheetApp.getUi();
  const message = lireMessage_();
  const { entetes, lignes } = lireDestinataires_();
  if (!lignes.length) throw new Error('L’onglet des destinataires est vide.');

  const reponse = ui.prompt('Envoyer un essai', 'À quelle adresse ? (le message utilisera la première ligne du tableau)', ui.ButtonSet.OK_CANCEL);
  if (reponse.getSelectedButton() !== ui.Button.OK) return;
  const adresse = reponse.getResponseText().trim();
  if (!adresse.includes('@')) throw new Error('Cette adresse ne semble pas valide.');

  const valeurs = valeursDeLaLigne_(entetes, lignes[0]);
  MailApp.sendEmail(composer_(adresse, '[Essai] ' + remplir_(message.objet, valeurs), remplir_(message.texte, valeurs)));
  ui.alert(`Essai envoyé à ${adresse}. Relisez-le avant d’envoyer à tout le monde.`);
}

/** Envoie le message à chaque ligne qui n'a pas encore de date dans « Envoyé le ». */
function envoyerATous() {
  const ui = SpreadsheetApp.getUi();
  const message = lireMessage_();
  const { feuille, entetes, lignes } = lireDestinataires_();
  const iEmail = entetes.indexOf(REGLAGES.colonneEmail);
  const iEnvoi = entetes.indexOf(REGLAGES.colonneEnvoi);

  const aEnvoyer = [];
  lignes.forEach((ligne, i) => {
    if (String(ligne[iEmail]).trim() && ligne[iEnvoi] === '') aEnvoyer.push({ ligne, numero: i + 2 });
  });
  if (!aEnvoyer.length) {
    ui.alert('Personne à qui écrire : chaque adresse a déjà une date dans « ' + REGLAGES.colonneEnvoi + ' ».');
    return;
  }

  const quota = MailApp.getRemainingDailyQuota();
  if (quota < 1) {
    ui.alert('La limite quotidienne de mails est atteinte. Relancez demain : le script reprendra là où il s’est arrêté.');
    return;
  }
  const lot = aEnvoyer.slice(0, quota);
  const reste = aEnvoyer.length - lot.length;
  const confirmation = ui.alert(
    'Confirmer l’envoi',
    `${lot.length} message(s) vont partir maintenant.` +
      (reste ? `\nLimite du jour atteinte : les ${reste} autres partiront en relançant demain.` : '') +
      '\n\nAvez-vous envoyé un essai ?',
    ui.ButtonSet.YES_NO,
  );
  if (confirmation !== ui.Button.YES) return;

  let envoyes = 0;
  const erreurs = [];
  for (const { ligne, numero } of lot) {
    const caseEnvoi = feuille.getRange(numero, iEnvoi + 1);
    try {
      const valeurs = valeursDeLaLigne_(entetes, ligne);
      MailApp.sendEmail(composer_(String(ligne[iEmail]).trim(), remplir_(message.objet, valeurs), remplir_(message.texte, valeurs)));
      caseEnvoi.setValue(new Date());
      envoyes++;
    } catch (erreur) {
      // La case n'est plus vide : la ligne ne repartira pas tant qu'on ne l'a pas effacée.
      caseEnvoi.setValue('⚠️ ' + erreur.message);
      erreurs.push(`Ligne ${numero} : ${erreur.message}`);
    }
  }
  ui.alert(`${envoyes} message(s) envoyé(s).` + (erreurs.length ? `\n\nNon envoyés :\n${erreurs.join('\n')}\n\nCorrigez l’adresse, effacez la case « ${REGLAGES.colonneEnvoi} » puis relancez.` : ''));
}

// ── Mécanique interne ───────────────────────────────────────

function lireMessage_() {
  const feuille = SpreadsheetApp.getActive().getSheetByName(REGLAGES.ongletMessage);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.ongletMessage} » introuvable.`);
  const objet = String(feuille.getRange('B1').getValue()).trim();
  const texte = String(feuille.getRange('B2').getValue());
  if (!objet || !texte.trim()) throw new Error(`Remplissez l’objet (B1) et le texte (B2) de l’onglet « ${REGLAGES.ongletMessage} ».`);
  return { objet, texte };
}

function lireDestinataires_() {
  const feuille = SpreadsheetApp.getActive().getSheetByName(REGLAGES.ongletDestinataires);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.ongletDestinataires} » introuvable.`);
  const [entetes, ...lignes] = feuille.getDataRange().getValues();
  const titres = entetes.map((titre) => String(titre).trim());
  for (const requise of [REGLAGES.colonneEmail, REGLAGES.colonneEnvoi]) {
    if (!titres.includes(requise)) throw new Error(`Colonne « ${requise} » introuvable en ligne 1 de l’onglet « ${REGLAGES.ongletDestinataires} ».`);
  }
  verifierChamps_(lireMessage_(), titres);
  return { feuille, entetes: titres, lignes };
}

/** Refuse d'envoyer si le message utilise un {{champ}} qui n'est pas une colonne. */
function verifierChamps_(message, titres) {
  const inconnus = champs_(message.objet + '\n' + message.texte).filter((nom) => !titres.includes(nom));
  if (inconnus.length) {
    throw new Error(`Le message utilise ${inconnus.map((n) => '{{' + n + '}}').join(', ')}, mais aucune colonne ne porte ce titre.`);
  }
}

function champs_(texte) {
  return [...texte.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1]);
}

function remplir_(modele, valeurs) {
  return modele.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (tout, nom) => (Object.prototype.hasOwnProperty.call(valeurs, nom) ? valeurs[nom] : tout));
}

function valeursDeLaLigne_(entetes, ligne) {
  const valeurs = {};
  entetes.forEach((titre, j) => {
    const v = ligne[j];
    valeurs[titre] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy') : String(v);
  });
  return valeurs;
}

function composer_(destinataire, objet, texte) {
  const options = { to: destinataire, subject: objet, body: texte };
  if (REGLAGES.nomExpediteur) options.name = REGLAGES.nomExpediteur;
  if (REGLAGES.repondreA) options.replyTo = REGLAGES.repondreA;
  return options;
}
