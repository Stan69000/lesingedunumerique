---
kind: recette
etagere: securite
title: Une sauvegarde automatique de vos tableaux chaque semaine
description: Chaque dimanche, une copie datée du fichier des adhérents, de la trésorerie ou des inscriptions. Une fausse manipulation ou une suppression se rattrape en deux clics.
pubDate: 2026-11-11
draft: true
niveau: 1
duree: 15 min
services: [Drive, Sheets]
declencheur: Tout seul, une fois par semaine
compteGratuit: Oui, dans la limite de l’espace Drive (15 Go partagés avec Gmail)
donnees: contacts
autorisations:
  - droit: Consulter, modifier, créer et supprimer tous vos fichiers Google Drive
    pourquoi: copier les fichiers listés dans le dossier de sauvegarde et mettre à la corbeille les plus anciennes sauvegardes. C’est le droit le plus large de l’atelier, et le seul qui permette de copier un fichier ; lisez le script, il ne touche qu’aux fichiers et au dossier que vous lui indiquez.
  - droit: Autoriser cette application à s’exécuter lorsque vous n’êtes pas présent
    pourquoi: lancer la sauvegarde chaque semaine, même ordinateur éteint.
sources:
  - title: Cybermalveillance.gouv.fr — Les sauvegardes
    url: https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/sauvegardes
  - title: Google — Récupérer un fichier supprimé dans Drive
    url: https://support.google.com/drive/answer/2405957?hl=fr
---

## Avant / après

**Avant** : le fichier des adhérents vit dans un seul tableau, modifié par plusieurs personnes. Une colonne effacée par erreur, un tri qui mélange les lignes, et on s’en rend compte trois semaines plus tard. L’historique des versions de Google aide, mais il faut savoir le retrouver.

**Après** : chaque dimanche à 3 h, un dossier « Sauvegarde 2026-11-15 » apparaît dans Drive, avec une copie de chaque fichier important. Les huit dernières semaines sont gardées, les plus anciennes partent à la corbeille.

> 🐒 **Le réflexe d’Octet** : une sauvegarde dans le même compte Google vous protège des erreurs, pas de la perte du compte (piratage, mot de passe oublié). Une fois par trimestre, téléchargez aussi vos fichiers essentiels (**Fichier > Télécharger**) et rangez-les sur un support de l’association.

## Ce qu’il vous faut

- Les **fichiers à protéger** : notez l’adresse de chacun, celle qui s’affiche dans le navigateur quand il est ouvert.
- Un **dossier Drive** pour les sauvegardes, partagé seulement avec les membres du bureau qui en ont besoin. Ouvrez-le et notez son adresse.
- Le **compte Google de l’association**, propriétaire des fichiers ou au moins autorisé à les consulter.

## 1. Créer le script

Celui-ci n’est rangé dans aucun tableau : c’est un **script autonome**. Ouvrez [script.google.com](https://script.google.com/), cliquez sur **Nouveau projet**, renommez-le « Sauvegarde hebdomadaire » (en haut à gauche), effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 2. Régler

Dans `REGLAGES` :

- `fichiers` : collez l’adresse de chaque fichier entre apostrophes, une par ligne, suivie d’une virgule.
- `dossier` : l’adresse du dossier de sauvegarde.
- `garder` : le nombre de semaines conservées. Comptez la place : huit copies d’un petit tableau ne pèsent presque rien, huit copies d’un dossier photo, si.
- `jour` et `heure` : le moment de la sauvegarde, en anglais pour le jour (c’est ce que Google attend).

Enregistrez.

## 3. Essayer, puis installer

1. Choisissez **sauvegarder** dans la liste des fonctions, puis **Exécuter**. Autorisez ([l’écran expliqué](/outils/atelier/autoriser-un-script-sans-paniquer/)). Un dossier daté apparaît dans votre dossier de sauvegarde, avec les copies.
2. Choisissez **installer**, puis **Exécuter**. C’est en place.
3. Dans l’icône **Déclencheurs** (le réveil), ouvrez la ligne créée et réglez **Paramètres de notification d’échec** sur **M’avertir immédiatement**. Si un fichier ne peut pas être copié (supprimé, déplacé, accès retiré), le script échoue exprès pour que Google vous prévienne.

## Restaurer une sauvegarde

Ouvrez le dossier de la date voulue et ouvrez la copie. Deux possibilités :

- **Récupérer quelques lignes** : copiez-les depuis la sauvegarde et collez-les dans le fichier d’origine. Les liens vers ce fichier (formulaire, partages) restent intacts.
- **Tout remplacer** : mieux vaut éviter. Un formulaire associé, les partages et les scripts sont liés au fichier d’origine, pas à sa copie.

## Bon à savoir

- Les copies appartiennent au compte qui exécute le script et prennent la place de ce compte dans Drive.
- Une sauvegarde contient les mêmes données personnelles que l’original : même prudence sur les partages, et ne gardez pas plus de semaines que nécessaire.
- Les sauvegardes mises à la corbeille restent récupérables 30 jours.
