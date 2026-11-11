/**
 * L'atelier d'Octet — Des créneaux bénévoles qui se ferment quand ils sont pleins
 * https://lesingedunumerique.fr/outils/atelier/creneaux-benevoles/
 *
 * À coller dans le tableau qui reçoit les réponses du formulaire
 * (Extensions > Apps Script). Onglet « Créneaux » : Créneau, Date, Début,
 * Fin, Lieu, Places. Ne modifiez que le bloc REGLAGES.
 *
 * atelier: accès complet assumé — le script modifie le formulaire, un fichier
 * distinct du tableau : la restriction @OnlyCurrentDoc l'en empêcherait.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  ongletCreneaux: 'Créneaux',
  ongletReponses: 'Réponses au formulaire 1',
  question: 'Créneau', // titre exact de la question à choix du formulaire
  colonneStatut: 'Statut', // créée par le script si elle manque
  messageComplet: 'Tous les créneaux sont complets. Merci pour votre élan, et à bientôt !',
};
// ── Fin des réglages ─────────────────────────────────────────

const CONFIRME = 'Confirmé';
const ATTENTE = "Liste d'attente";
const INCONNU = 'Créneau inconnu';

/** Ajoute le menu « 🐒 Octet » à l'ouverture du tableau. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐒 Octet')
    .addItem('Recompter les places et mettre à jour le formulaire', 'mettreAJourCreneaux')
    .addToUi();
}

/** Lancée par le déclencheur à chaque inscription. */
function apresInscription() {
  mettreAJourCreneaux();
}

/**
 * Recompte les inscrits, note le statut de chacun et ne laisse dans le
 * formulaire que les créneaux qui ont encore de la place.
 */
function mettreAJourCreneaux() {
  // Deux inscriptions simultanées : la seconde attend que la première ait fini de compter.
  const verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  try {
    const classeur = SpreadsheetApp.getActive();
    const capacites = lireCapacites_(classeur);
    const { feuille, iCreneau, iStatut, lignes } = lireInscriptions_(classeur);
    const { statuts, restantes } = repartir_(lignes.map((ligne) => ({ creneau: ligne[iCreneau], horodatage: ligne[0] })), capacites);

    if (statuts.length) {
      feuille.getRange(2, iStatut + 1, statuts.length, 1).setValues(statuts.map((s) => [s]));
    }
    mettreAJourFormulaire_(classeur, capacites, restantes);
  } finally {
    verrou.releaseLock();
  }
}

/** Installe le déclencheur « à l'envoi du formulaire ». Sans doublon. */
function installerCreneaux() {
  desinstallerCreneaux();
  ScriptApp.newTrigger('apresInscription').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  mettreAJourCreneaux();
  console.log('C’est prêt : le formulaire se met à jour à chaque inscription.');
}

/** Retire le déclencheur : le formulaire ne bougera plus tout seul. */
function desinstallerCreneaux() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'apresInscription')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ── Mécanique interne ───────────────────────────────────────

/** Les créneaux dans l'ordre de l'onglet, avec leur nombre de places. */
function lireCapacites_(classeur) {
  const feuille = classeur.getSheetByName(REGLAGES.ongletCreneaux);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.ongletCreneaux} » introuvable.`);
  const [entetes, ...lignes] = feuille.getDataRange().getValues();
  const titres = entetes.map((t) => String(t).trim());
  const iNom = titres.indexOf('Créneau');
  const iPlaces = titres.indexOf('Places');
  if (iNom === -1 || iPlaces === -1) throw new Error(`L’onglet « ${REGLAGES.ongletCreneaux} » doit avoir les colonnes « Créneau » et « Places ».`);
  const capacites = [];
  for (const ligne of lignes) {
    const nom = String(ligne[iNom]).trim();
    if (!nom) continue;
    const places = Number(ligne[iPlaces]);
    if (!Number.isInteger(places) || places < 0) throw new Error(`Nombre de places invalide pour « ${nom} ».`);
    capacites.push({ nom, places });
  }
  if (!capacites.length) throw new Error(`Aucun créneau dans l’onglet « ${REGLAGES.ongletCreneaux} ».`);
  return capacites;
}

function lireInscriptions_(classeur) {
  const feuille = classeur.getSheetByName(REGLAGES.ongletReponses);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.ongletReponses} » introuvable : indiquez dans REGLAGES le nom de l’onglet des réponses.`);
  const derniereColonne = feuille.getLastColumn();
  const titres = feuille.getRange(1, 1, 1, derniereColonne).getValues()[0].map((t) => String(t).trim());
  const iCreneau = titres.indexOf(REGLAGES.question);
  if (iCreneau === -1) throw new Error(`Colonne « ${REGLAGES.question} » introuvable dans les réponses.`);
  let iStatut = titres.indexOf(REGLAGES.colonneStatut);
  if (iStatut === -1) {
    feuille.getRange(1, derniereColonne + 1).setValue(REGLAGES.colonneStatut);
    iStatut = derniereColonne;
  }
  const nbLignes = feuille.getLastRow() - 1;
  const lignes = nbLignes > 0 ? feuille.getRange(2, 1, nbLignes, Math.max(derniereColonne, iStatut + 1)).getValues() : [];
  return { feuille, iCreneau, iStatut, lignes };
}

/**
 * Premier arrivé, premier servi : les inscriptions sont triées par heure
 * d'envoi, les `places` premières de chaque créneau sont confirmées, les
 * suivantes passent en liste d'attente. Fonction pure.
 */
function repartir_(inscriptions, capacites) {
  const places = {};
  capacites.forEach((c) => { places[c.nom] = c.places; });
  const restantes = { ...places };
  const statuts = new Array(inscriptions.length).fill('');
  const ordre = inscriptions
    .map((inscription, i) => ({ ...inscription, i }))
    .filter((inscription) => String(inscription.creneau).trim())
    .sort((a, b) => horodatage_(a) - horodatage_(b) || a.i - b.i);
  for (const inscription of ordre) {
    const nom = String(inscription.creneau).trim();
    if (!Object.prototype.hasOwnProperty.call(places, nom)) statuts[inscription.i] = INCONNU;
    else if (restantes[nom] > 0) {
      restantes[nom]--;
      statuts[inscription.i] = CONFIRME;
    } else statuts[inscription.i] = ATTENTE;
  }
  return { statuts, restantes };
}

function horodatage_(inscription) {
  return inscription.horodatage instanceof Date ? inscription.horodatage.getTime() : Number.MAX_SAFE_INTEGER;
}

/** Les créneaux à proposer, dans l'ordre de l'onglet, et le texte d'aide. */
function choixDisponibles_(capacites, restantes) {
  const libres = capacites.filter((c) => restantes[c.nom] > 0);
  const aide = libres.length
    ? 'Places restantes : ' + libres.map((c) => `${c.nom} (${restantes[c.nom]})`).join(', ')
    : '';
  return { libres: libres.map((c) => c.nom), aide };
}

function mettreAJourFormulaire_(classeur, capacites, restantes) {
  const adresse = classeur.getFormUrl();
  if (!adresse) throw new Error('Ce tableau ne reçoit les réponses d’aucun formulaire. Associez-le depuis l’onglet Réponses du formulaire.');
  const formulaire = FormApp.openByUrl(adresse);
  const question = trouverQuestion_(formulaire);
  const { libres, aide } = choixDisponibles_(capacites, restantes);

  if (!libres.length) {
    formulaire.setCustomClosedFormMessage(REGLAGES.messageComplet);
    formulaire.setAcceptingResponses(false);
    return;
  }
  question.setChoiceValues(libres);
  question.setHelpText(aide);
  // Une place s'est libérée (désistement supprimé du tableau) : on rouvre.
  if (!formulaire.isAcceptingResponses()) formulaire.setAcceptingResponses(true);
}

function trouverQuestion_(formulaire) {
  for (const item of formulaire.getItems()) {
    if (item.getTitle().trim() !== REGLAGES.question) continue;
    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) return item.asMultipleChoiceItem();
    if (item.getType() === FormApp.ItemType.LIST) return item.asListItem();
    throw new Error(`La question « ${REGLAGES.question} » doit être à choix multiples ou une liste déroulante.`);
  }
  throw new Error(`Question « ${REGLAGES.question} » introuvable dans le formulaire.`);
}
