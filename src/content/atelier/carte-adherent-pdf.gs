/**
 * L'atelier d'Octet — Une carte d'adhérent en PDF pour chaque ligne du tableau
 * https://lesingedunumerique.fr/outils/atelier/carte-adherent-pdf/
 *
 * À coller dans le tableau des adhérents (Extensions > Apps Script).
 * Le modèle est un document Google Docs qui contient des {{champs}} :
 * {{Prénom}}, {{Nom}}, {{Fin d'adhésion}}… (les titres des colonnes).
 * Ne modifiez que le bloc REGLAGES.
 *
 * atelier: accès complet assumé — le script doit ouvrir le modèle Docs et
 * écrire dans un dossier Drive, deux fichiers distincts du tableau : la
 * restriction @OnlyCurrentDoc l'en empêcherait.
 */

// ── Réglages ─────────────────────────────────────────────────
const REGLAGES = {
  onglet: 'Adhérents',
  colonneCarte: 'Carte', // le script y note le lien du PDF

  // Adresses (ou identifiants) du modèle Google Docs et du dossier des cartes.
  modele: 'https://docs.google.com/document/d/XXXXXXXXXXXX/edit',
  dossier: 'https://drive.google.com/drive/folders/XXXXXXXXXXXX',

  // Nom de chaque fichier ; mêmes {{champs}} que dans le modèle.
  nomFichier: 'Carte adhérent {{Prénom}} {{Nom}}',
};
// ── Fin des réglages ─────────────────────────────────────────

/** Ajoute le menu « 🐒 Octet » à l'ouverture du tableau. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐒 Octet')
    .addItem('Créer les cartes manquantes', 'creerCartes')
    .addToUi();
}

/** Crée une carte PDF pour chaque ligne dont la colonne « Carte » est vide. */
function creerCartes() {
  const ui = SpreadsheetApp.getUi();
  const modele = DriveApp.getFileById(extraireId_(REGLAGES.modele));
  const dossier = DriveApp.getFolderById(extraireId_(REGLAGES.dossier));
  const { feuille, entetes, lignes } = lireTableau_();
  const iCarte = entetes.indexOf(REGLAGES.colonneCarte);

  const inconnus = champsInconnus_(texteDuModele_(modele) + '\n' + REGLAGES.nomFichier, entetes);
  if (inconnus.length) {
    throw new Error(`Le modèle utilise ${inconnus.map((n) => '{{' + n + '}}').join(', ')}, mais aucune colonne ne porte ce titre.`);
  }

  const aFaire = [];
  lignes.forEach((ligne, k) => {
    const remplie = ligne.some((valeur, j) => j !== iCarte && valeur !== '');
    if (remplie && ligne[iCarte] === '') aFaire.push({ ligne, numero: k + 2 });
  });
  if (!aFaire.length) {
    ui.alert('Toutes les lignes ont déjà leur carte.');
    return;
  }
  const ok = ui.alert('Créer les cartes', `${aFaire.length} carte(s) à créer dans le dossier « ${dossier.getName()} ». On y va ?`, ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  const debut = Date.now();
  let faites = 0;
  let interrompu = false;
  const erreurs = [];
  for (const { ligne, numero } of aFaire) {
    // Google arrête un script au bout de 6 minutes : on s'arrête avant, proprement.
    if (Date.now() - debut > 5 * 60 * 1000) {
      interrompu = true;
      break;
    }
    try {
      const valeurs = valeursDeLaLigne_(entetes, ligne);
      const nom = remplir_(REGLAGES.nomFichier, valeurs).trim();
      const pdf = fabriquerPdf_(modele, dossier, nom, valeurs);
      feuille.getRange(numero, iCarte + 1).setValue(pdf.getUrl());
      faites++;
    } catch (erreur) {
      erreurs.push(`Ligne ${numero} : ${erreur.message}`);
    }
  }

  ui.alert(
    `${faites} carte(s) créée(s).` +
      (interrompu ? '\nIl en reste : relancez le menu pour continuer.' : '') +
      (erreurs.length ? `\n\nÀ corriger :\n${erreurs.join('\n')}` : ''),
  );
}

// ── Mécanique interne ───────────────────────────────────────

function lireTableau_() {
  const feuille = SpreadsheetApp.getActive().getSheetByName(REGLAGES.onglet);
  if (!feuille) throw new Error(`Onglet « ${REGLAGES.onglet} » introuvable.`);
  const [entetes, ...lignes] = feuille.getDataRange().getValues();
  const titres = entetes.map((titre) => String(titre).trim());
  if (!titres.includes(REGLAGES.colonneCarte)) {
    throw new Error(`Colonne « ${REGLAGES.colonneCarte} » introuvable en ligne 1 : ajoutez-la, vide.`);
  }
  return { feuille, entetes: titres, lignes };
}

/** Copie le modèle, le remplit, l'exporte en PDF, puis met la copie à la corbeille. */
function fabriquerPdf_(modele, dossier, nom, valeurs) {
  const copie = modele.makeCopy(nom, dossier);
  try {
    const doc = DocumentApp.openById(copie.getId());
    [doc.getBody(), doc.getHeader(), doc.getFooter()]
      .filter((partie) => partie)
      .forEach((partie) => {
        for (const [champ, valeur] of Object.entries(valeurs)) {
          remplacerLitteral_(partie, `\\{\\{\\s*${echapper_(champ)}\\s*\\}\\}`, valeur);
        }
      });
    doc.saveAndClose();
    return dossier.createFile(copie.getAs(MimeType.PDF)).setName(`${nom}.pdf`);
  } finally {
    copie.setTrashed(true); // la copie Docs ne sert plus : seule la carte PDF reste
  }
}

function texteDuModele_(modele) {
  const doc = DocumentApp.openById(modele.getId());
  return [doc.getBody(), doc.getHeader(), doc.getFooter()]
    .filter((partie) => partie)
    .map((partie) => partie.getText())
    .join('\n');
}

/** Les {{champs}} d'un texte, dans l'ordre, sans doublon. */
function champs_(texte) {
  return [...new Set([...texte.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1]))];
}

function champsInconnus_(texte, titres) {
  return champs_(texte).filter((nom) => !titres.includes(nom));
}

function remplir_(modele, valeurs) {
  return modele.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (tout, nom) => (Object.prototype.hasOwnProperty.call(valeurs, nom) ? valeurs[nom] : tout));
}

function formatJour_(d) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function valeursDeLaLigne_(entetes, ligne) {
  const valeurs = {};
  entetes.forEach((titre, j) => {
    const v = ligne[j];
    valeurs[titre] = v instanceof Date ? formatJour_(v) : String(v);
  });
  return valeurs;
}

/**
 * Remplace chaque occurrence du motif par la valeur, telle quelle. replaceText
 * interpréterait certains caractères de la valeur (« $ », « \ ») : un montant
 * comme « 15 $ » ou un nom avec une barre oblique serait abîmé.
 */
function remplacerLitteral_(partie, motif, valeur) {
  for (let garde = 0; garde < 500; garde++) {
    const trouve = partie.findText(motif);
    if (!trouve) return;
    const texte = trouve.getElement().asText();
    const debut = trouve.getStartOffset();
    texte.deleteText(debut, trouve.getEndOffsetInclusive());
    if (valeur) texte.insertText(debut, valeur);
  }
  throw new Error('Trop de champs à remplacer dans le modèle : une valeur contient-elle elle-même un {{champ}} ?');
}

/** Un titre de colonne peut contenir des caractères spéciaux : on les neutralise dans le motif. */
function echapper_(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Accepte une adresse complète ou un identifiant seul. */
function extraireId_(adresse) {
  const texte = String(adresse).trim();
  const trouve = texte.match(/\/(?:d|folders)\/([\w-]{10,})/) || texte.match(/[?&]id=([\w-]{10,})/);
  if (trouve) return trouve[1];
  if (/^[\w-]{10,}$/.test(texte)) return texte;
  throw new Error(`Impossible de lire un identifiant Drive dans « ${texte} ».`);
}
