/**
 * @OnlyCurrentDoc
 *
 * L'atelier d'Octet — Les événements du tableau dans l'agenda partagé
 * https://lesingedunumerique.fr/outils/atelier/evenements-agenda/
 *
 * À coller dans le tableau des événements (Extensions > Apps Script).
 * Colonnes attendues, à partir de A : Titre, Début, Fin, Lieu,
 * Description, Identifiant agenda. Ne modifiez que le bloc REGLAGES.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  // Paramètres de l'agenda > Intégrer l'agenda > « ID de l'agenda ».
  idAgenda: 'xxxxxxxx@group.calendar.google.com',

  // Nom de l'onglet qui contient les événements.
  onglet: 'Événements',

  // Durée par défaut quand la colonne Fin est vide (en heures).
  dureeParDefaut: 2,
};
// ── Fin des réglages ─────────────────────────────────────────

const COLONNES = 6; // Titre, Début, Fin, Lieu, Description, Identifiant agenda

/** Ajoute le menu « 🐒 Octet » à l'ouverture du tableau. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐒 Octet')
    .addItem('Envoyer les événements vers l’agenda', 'synchroniserAgenda')
    .addToUi();
}

/** Crée les nouveaux événements et met à jour ceux déjà envoyés. */
function synchroniserAgenda() {
  const agenda = CalendarApp.getCalendarById(REGLAGES.idAgenda);
  if (!agenda) {
    throw new Error('Agenda introuvable : vérifiez REGLAGES.idAgenda, et que ce compte peut modifier cet agenda.');
  }
  const feuille = SpreadsheetApp.getActive().getSheetByName(REGLAGES.onglet);
  if (!feuille) {
    throw new Error(`Onglet « ${REGLAGES.onglet} » introuvable. Renommez l’onglet ou modifiez REGLAGES.onglet.`);
  }
  const nbLignes = feuille.getLastRow() - 1; // la ligne 1 contient les titres
  if (nbLignes < 1) {
    informer_('Aucun événement à envoyer.');
    return;
  }

  const lignes = feuille.getRange(2, 1, nbLignes, COLONNES).getValues();
  const bilan = { crees: 0, misAJour: 0, problemes: [] };
  const identifiants = lignes.map((ligne, i) => {
    const [titre, debut, fin, lieu, description, id] = ligne;
    const numero = i + 2;
    if (!titre && !debut) return [id]; // ligne vide
    try {
      const creneau = lireCreneau_(debut, fin);
      const options = { location: String(lieu || ''), description: String(description || '') };
      const existant = id ? agenda.getEventById(String(id)) : null;
      if (existant) {
        mettreAJour_(existant, String(titre), creneau, options);
        bilan.misAJour++;
        return [id];
      }
      const cree = creer_(agenda, String(titre), creneau, options);
      bilan.crees++;
      return [cree.getId()];
    } catch (erreur) {
      bilan.problemes.push(`Ligne ${numero} : ${erreur.message}`);
      return [id];
    }
  });
  feuille.getRange(2, COLONNES, identifiants.length, 1).setValues(identifiants);

  const resume = `${bilan.crees} créé(s), ${bilan.misAJour} mis à jour.`;
  if (bilan.problemes.length) {
    SpreadsheetApp.getUi().alert(`${resume}\n\nÀ corriger :\n${bilan.problemes.join('\n')}`);
  } else {
    informer_(resume);
  }
}

// ── Mécanique interne ───────────────────────────────────────

/** Un créneau horaire, ou une journée entière quand aucune heure n'est saisie. */
function lireCreneau_(debut, fin) {
  if (!(debut instanceof Date)) throw new Error('la date de début est vide ou n’est pas une date.');
  if (fin !== '' && !(fin instanceof Date)) throw new Error('la date de fin n’est pas une date.');
  const sansHeure = (d) => d.getHours() === 0 && d.getMinutes() === 0;

  if (sansHeure(debut) && (fin === '' || sansHeure(fin))) {
    const dernierJour = fin === '' ? debut : fin;
    if (dernierJour < debut) throw new Error('la fin est avant le début.');
    const lendemain = new Date(dernierJour.getTime());
    lendemain.setDate(lendemain.getDate() + 1); // l'agenda attend le jour suivant le dernier jour
    return { journee: true, debut, fin: lendemain };
  }

  const finReelle = fin === '' ? new Date(debut.getTime() + REGLAGES.dureeParDefaut * 3600 * 1000) : fin;
  if (finReelle <= debut) throw new Error('la fin est avant le début.');
  return { journee: false, debut, fin: finReelle };
}

function creer_(agenda, titre, creneau, options) {
  return creneau.journee
    ? agenda.createAllDayEvent(titre, creneau.debut, creneau.fin, options)
    : agenda.createEvent(titre, creneau.debut, creneau.fin, options);
}

function mettreAJour_(evenement, titre, creneau, options) {
  evenement.setTitle(titre);
  if (creneau.journee) evenement.setAllDayDates(creneau.debut, creneau.fin);
  else evenement.setTime(creneau.debut, creneau.fin);
  evenement.setLocation(options.location);
  evenement.setDescription(options.description);
}

function informer_(message) {
  SpreadsheetApp.getActive().toast(message, '🐒 Octet', 8);
}
