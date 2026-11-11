---
kind: recette
etagere: evenements
title: Un rappel la veille à chaque bénévole inscrit
description: La veille de son créneau, chaque bénévole reçoit un mail avec l’heure et le lieu. Moins d’oublis le jour J, et une porte ouverte pour prévenir en cas d’empêchement.
pubDate: 2026-11-11
draft: true
niveau: 2
duree: 15 min
services: [Sheets, Gmail]
declencheur: Tout seul, une fois par jour
compteGratuit: Oui, jusqu’à 100 rappels par jour
donnees: contacts
autorisations:
  - droit: Afficher, modifier, créer et supprimer toutes vos feuilles de calcul Google Sheets
    pourquoi: lire les créneaux et les inscrits, et noter chaque rappel envoyé. Ce droit large vient de la recette des créneaux, qui partage le même projet ; ce script ne lit que ce tableau.
  - droit: Envoyer des e-mails en votre nom
    pourquoi: envoyer les rappels. Le script ne peut pas lire votre boîte.
  - droit: Autoriser cette application à s’exécuter lorsque vous n’êtes pas présent
    pourquoi: passer chaque jour, même ordinateur éteint.
sources:
  - title: Google — Les déclencheurs installables (en anglais)
    url: https://developers.google.com/apps-script/guides/triggers/installable
  - title: Google — Le service MailApp (en anglais)
    url: https://developers.google.com/apps-script/reference/mail/mail-app
---

## Avant / après

**Avant** : la veille de la fête, quelqu’un reprend la liste et envoie un message à chaque bénévole, ou ne le fait pas, faute de temps. Le jour J, deux personnes ont oublié.

**Après** : chaque soir, le script regarde les créneaux du lendemain et écrit à chaque inscrit confirmé : le créneau, la date, l’heure, le lieu. Il note l’envoi dans le tableau : personne ne reçoit deux fois le même rappel.

## Ce qu’il vous faut

Cette recette prolonge [les créneaux bénévoles qui se ferment quand ils sont pleins](/outils/atelier/creneaux-benevoles/) et utilise le même tableau :

- l’onglet **Créneaux**, avec les colonnes **Créneau**, **Date**, **Début**, **Fin** et **Lieu** remplies ;
- l’onglet des réponses au formulaire, avec l’adresse e-mail, le prénom et le créneau choisi ;
- la colonne **Statut** écrite par la recette des créneaux : seules les personnes « Confirmé » sont prévenues, pas celles en liste d’attente.

Vous n’utilisez pas la recette des créneaux ? Le rappel fonctionne aussi seul : sans colonne **Statut**, tous les inscrits sont prévenus.

Pour récupérer l’adresse e-mail, le plus simple est d’activer dans le formulaire **Paramètres > Réponses > Collecter les adresses e-mail**. La colonne s’appelle alors « Adresse e-mail ».

## 1. Ajouter le script au projet

Ce script vit **à côté** de celui des créneaux, dans le même projet :

1. Dans le tableau, ouvrez **Extensions > Apps Script**. Vous retrouvez le script des créneaux.
2. À gauche, à côté de **Fichiers**, cliquez sur **+**, puis **Script**. Nommez le fichier « rappels ».
3. Effacez le contenu du nouveau fichier et collez le script ci-dessous. **Ne touchez pas au fichier des créneaux.**

<!-- script -->

Les deux scripts partagent le même projet : c’est pour cela que celui-ci a son propre bloc de réglages, `RAPPELS`, et ses propres noms de fonctions. Deux blocs `REGLAGES` dans un même projet provoqueraient une erreur.

## 2. Régler

Dans `RAPPELS` :

- les noms des onglets et des colonnes, s’ils diffèrent ;
- `heure` : l’heure d’envoi, la veille (18 h par défaut) ;
- `nomAsso`, `objet` et `message` ;
- `adresseTest` : votre adresse.

Enregistrez.

## 3. Essayer, puis installer

1. Lancez **testerRappel**. Vous recevez le rappel du premier créneau de l’onglet, adressé à « Camille ». Vérifiez la date et les heures : elles doivent s’afficher comme dans le tableau.
2. Lancez **installerRappels**. À partir de ce soir, le script passera chaque jour à l’heure choisie.
3. Dans l’icône **Déclencheurs** (le réveil), réglez **Paramètres de notification d’échec** sur **M’avertir immédiatement**.

Pour un vrai essai complet : ajoutez un créneau daté de demain, inscrivez-vous avec votre adresse, et attendez l’heure d’envoi. Une date apparaît dans la colonne **Rappel envoyé**, ajoutée par le script à droite des réponses.

## Si ça ne marche pas

- **Personne n’est prévenu** : vérifiez que la colonne **Date** de l’onglet Créneaux contient de vraies dates (alignées à droite), et que le nom du créneau est identique dans les deux onglets.
- **Les heures s’affichent bizarrement** : le script reprend le texte tel qu’affiché dans les cases **Début** et **Fin**. Choisissez le format **Format > Nombre > Heure** pour ces colonnes.
- **Une personne a changé de créneau** : effacez sa case **Rappel envoyé**, sinon elle ne sera pas prévenue pour le nouveau.

## Pour aller plus loin

- Ajoutez au message le numéro de la personne à appeler le jour J, ou un lien vers le plan d’accès.
- Après l’événement, un mot de remerciement fait toujours plaisir : [le publipostage](/outils/atelier/publipostage/) s’en charge en quelques minutes.
