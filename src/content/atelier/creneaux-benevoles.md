---
kind: recette
etagere: evenements
title: Des créneaux bénévoles qui se ferment quand ils sont pleins
description: Les bénévoles s’inscrivent par formulaire. Dès qu’un créneau est complet, il disparaît des choix, et le formulaire se ferme quand tout est pris. Fini les douze personnes au stand buvette et personne au rangement.
pubDate: 2026-11-11
draft: true
niveau: 2
duree: 25 min
services: [Forms, Sheets]
declencheur: Tout seul, à chaque inscription
compteGratuit: Oui
donnees: contacts
autorisations:
  - droit: Afficher, modifier, créer et supprimer toutes vos feuilles de calcul Google Sheets
    pourquoi: lire les créneaux et les inscriptions, et noter le statut de chacun. Le script ne touche qu’à ce tableau, mais Google ne permet pas de limiter ce droit quand le script doit aussi modifier le formulaire.
  - droit: Afficher, modifier, créer et supprimer tous vos formulaires Google Forms
    pourquoi: retirer les créneaux pleins de la question, et fermer le formulaire quand tout est complet.
  - droit: Autoriser cette application à s’exécuter lorsque vous n’êtes pas présent
    pourquoi: se lancer tout seul à chaque inscription.
  - droit: Afficher et exécuter du contenu Web tiers dans les invites et les barres latérales des applications Google
    pourquoi: malgré son intitulé, c’est le droit d’afficher le menu 🐒 Octet. Aucun contenu extérieur n’est chargé.
sources:
  - title: Google — Le service Forms d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/reference/forms/form-app
  - title: Google — Le service Lock d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/reference/lock/lock-service
  - title: Google — Choisir où enregistrer les réponses d’un formulaire
    url: https://support.google.com/docs/answer/2917686?hl=fr
---

## Avant / après

**Avant** : un formulaire « Inscrivez-vous pour la fête de quartier », et le lundi, le constat. Huit personnes sur le créneau du samedi midi, aucune sur le démontage. Il faut rappeler tout le monde pour rééquilibrer.

**Après** : chaque créneau a un nombre de places. Dès qu’il est complet, il disparaît du formulaire. La question affiche les places restantes, et quand tout est pris, le formulaire se ferme avec un message de remerciement.

## Ce qu’il vous faut

- **Un formulaire Google Forms** avec au moins le prénom, l’adresse e-mail, et une question **à choix multiples** (ou **liste déroulante**) intitulée **Créneau**. Les choix seront écrits par le script : mettez-en un provisoire.
- **Ses réponses enregistrées dans un tableau** : dans le formulaire, onglet **Réponses**, **Associer à Sheets**.
- Dans ce tableau, **un onglet Créneaux** que vous créez, une ligne par créneau :

| Créneau | Date | Début | Fin | Lieu | Places |
| --- | --- | --- | --- | --- | --- |
| Samedi — installation | 13/06/2027 | 08:00 | 10:00 | Place du marché | 6 |
| Samedi — buvette | 13/06/2027 | 11:00 | 14:00 | Stand buvette | 3 |
| Samedi — rangement | 13/06/2027 | 18:00 | 20:00 | Place du marché | 6 |

Le script n’utilise que **Créneau** et **Places**. **Date**, **Début**, **Fin** et **Lieu** servent à la recette suivante, [le rappel la veille](/outils/atelier/rappel-veille-benevoles/) : remplissez-les dès maintenant.

## Pourquoi le script vit dans le tableau

Google permet d’accrocher un script au formulaire ou au tableau des réponses. Nous avons choisi le tableau : c’est là que se trouvent les places et les inscriptions, c’est le même déclencheur « à l’envoi du formulaire » que pour [le mail de bienvenue](/outils/atelier/bienvenue-adherents/), et le rappel de la veille pourra s’ajouter dans le même projet. Le revers : le script doit ouvrir le formulaire, un autre fichier, ce qui demande des droits plus larges que nos recettes habituelles.

## 1. Coller le script

Dans le tableau des réponses, ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 2. Régler

Dans `REGLAGES` :

- `ongletReponses` : le nom exact de l’onglet où arrivent les réponses, souvent « Réponses au formulaire 1 » ;
- `question` : le titre exact de la question des créneaux ;
- `messageComplet` : le message affiché quand le formulaire est fermé.

Enregistrez.

## 3. Installer

1. Choisissez **installerCreneaux** dans la liste des fonctions, puis **Exécuter**. Autorisez ([l’écran expliqué](/outils/atelier/autoriser-un-script-sans-paniquer/)).
2. Ouvrez le formulaire en mode aperçu : la question **Créneau** propose maintenant vos créneaux, avec les places restantes en dessous.
3. Faites une inscription d’essai. Dans le tableau, une colonne **Statut** apparaît avec « Confirmé ». Supprimez ensuite cette ligne d’essai et lancez **🐒 Octet > Recompter les places** (rechargez le tableau si le menu n’apparaît pas).

## Le statut de chaque inscription

| Statut | Ce que ça veut dire |
| --- | --- |
| Confirmé | La personne a une place. |
| Liste d'attente | Le créneau était déjà plein. |
| Créneau inconnu | Le choix ne correspond à aucune ligne de l’onglet Créneaux, souvent après un renommage. |

**Deux personnes pour la dernière place** : si elles envoient le formulaire à quelques secondes d’intervalle, Google accepte les deux réponses. Le script les traite l’une après l’autre et applique la règle du premier arrivé : la seconde passe en **Liste d'attente**. Pensez à la prévenir, et à lui proposer un autre créneau.

## Après un désistement ou un changement

Vous supprimez la ligne d’un bénévole qui se désiste, vous ajoutez des places, vous créez un créneau ? Lancez **🐒 Octet > Recompter les places et mettre à jour le formulaire**. Les statuts sont recalculés (la première personne en liste d’attente devient confirmée), le formulaire retrouve les créneaux qui ont de nouveau de la place, et il rouvre s’il était fermé.

## Si ça ne marche pas

- **« Ce tableau ne reçoit les réponses d’aucun formulaire »** : le script doit être collé dans le tableau associé au formulaire, pas dans un autre.
- **« Question introuvable »** : le titre dans `REGLAGES.question` doit être identique à celui du formulaire, sans espace en trop.
- **Une case à cocher** (plusieurs créneaux par personne) n’est pas gérée : utilisez un choix multiple, et proposez de remplir le formulaire une fois par créneau.

## Pour aller plus loin

- Pour fermer définitivement les inscriptions, lancez **desinstallerCreneaux** puis fermez le formulaire à la main : sinon un recomptage le rouvrirait s’il reste des places.
- Gardez le formulaire court : prénom, e-mail, téléphone si besoin le jour J, créneau. Rien de plus.
