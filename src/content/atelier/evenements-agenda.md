---
kind: recette
etagere: evenements
title: Les événements du tableau dans l’agenda partagé
description: Vous tenez la liste des événements dans un tableau ? Un clic les envoie dans un agenda Google que bénévoles et adhérents peuvent suivre sur leur téléphone.
pubDate: 2026-11-11
draft: true
niveau: 1
duree: 15 min
services: [Sheets, Agenda]
declencheur: À la demande, depuis le menu 🐒 Octet du tableau
compteGratuit: Oui
donnees: aucune
autorisations:
  - droit: Afficher et gérer les feuilles de calcul auxquelles cette application a été associée
    pourquoi: lire les événements et noter leur identifiant, dans ce tableau seulement.
  - droit: Consulter, modifier, partager et supprimer définitivement tous les agendas auxquels vous avez accès
    pourquoi: créer et mettre à jour les événements. C’est le seul droit que Google propose pour le service Agenda d’Apps Script, d’où l’intérêt de l’installer avec le compte de l’association plutôt qu’un compte personnel.
  - droit: Afficher et exécuter du contenu Web tiers dans les invites et les barres latérales des applications Google
    pourquoi: malgré son intitulé, c’est le droit d’afficher le menu 🐒 Octet et le bilan des erreurs. Aucun contenu extérieur n’est chargé.
sources:
  - title: Google — Créer un agenda partagé
    url: https://support.google.com/calendar/answer/37095?hl=fr
  - title: Google — Le service Agenda d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/reference/calendar/calendar-app
---

## Avant / après

**Avant** : les dates sont dans un tableau, et quelqu’un les recopie une par une dans l’agenda. Une heure change ? Il faut penser à la corriger aux deux endroits.

**Après** : le tableau reste la référence. Un clic sur **🐒 Octet > Envoyer les événements vers l’agenda** crée les nouveaux événements et met à jour ceux qui ont changé.

## Ce qu’il vous faut

- Un **agenda Google dédié à l’association**, distinct de l’agenda principal du compte. Dans Google Agenda, à gauche, **Autres agendas > + > Créer un agenda**. Vous pourrez ensuite le partager ou le rendre public.
- Un **tableau Google Sheets**, avec un onglet nommé **Événements** et ces six colonnes, dans cet ordre, à partir de A :

| Titre | Début | Fin | Lieu | Description | Identifiant agenda |
| --- | --- | --- | --- | --- | --- |
| Assemblée générale | 14/03/2027 14:00 | 14/03/2027 17:00 | Salle des fêtes | Ordre du jour envoyé par mail | |
| Brocante | 06/06/2027 | | Place du marché | | |

La dernière colonne reste vide : le script la remplit tout seul. **N’y touchez pas**, c’est elle qui lui permet de retrouver l’événement pour le mettre à jour.

## 1. Récupérer l’identifiant de l’agenda

Dans Google Agenda, survolez votre agenda dans la colonne de gauche, cliquez sur les trois points, puis **Paramètres et partage**. Descendez jusqu’à **Intégrer l’agenda** : copiez l’**ID de l’agenda**. Il ressemble à une longue adresse qui finit par `@group.calendar.google.com`.

## 2. Coller le script

Dans le tableau, ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 3. Régler et lancer

1. Dans `REGLAGES`, remplacez `idAgenda` par l’identifiant copié à l’étape 1. Si votre onglet porte un autre nom, modifiez `onglet`.
2. Enregistrez, puis revenez au tableau et rechargez la page : le menu **🐒 Octet** apparaît.
3. Cliquez sur **🐒 Octet > Envoyer les événements vers l’agenda**. La première fois, Google demande l’autorisation ([l’écran expliqué](/outils/atelier/autoriser-un-script-sans-paniquer/)) : relancez ensuite le menu.
4. Un message en bas à droite résume : « 2 créé(s), 0 mis à jour ». Ouvrez l’agenda pour vérifier.

## Bon à savoir

- **Journée entière** : saisissez une date sans heure, comme la brocante. Pour plusieurs jours, mettez aussi une date sans heure dans **Fin**.
- **Pas d’heure de fin** : l’événement dure 2 heures. Réglable avec `dureeParDefaut`.
- **Supprimer un événement** : supprimez-le dans l’agenda **et** effacez sa ligne. Le script ne supprime jamais rien de lui-même : une ligne effacée par erreur ne fait pas disparaître un événement.
- **Recréer un événement** supprimé dans l’agenda : videz sa case « Identifiant agenda » et relancez.
- **Dates mal comprises** : si une date reste alignée à gauche dans sa case, le tableau la prend pour du texte. Vérifiez **Fichier > Paramètres > Paramètres régionaux : France**.

## Pour aller plus loin

Rendez l’agenda public ou partagez son lien : dans **Paramètres et partage**, la rubrique **Intégrer l’agenda** donne aussi un code pour l’afficher sur le site de l’association.
