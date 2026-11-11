---
kind: premiers-pas
ordre: 3
title: Faire tourner un script tout seul, sans mauvaise surprise
description: Les déclencheurs, les messages d’erreur et les limites quotidiennes de Google, pour qu’un script ne s’arrête pas en silence.
pubDate: '2026-11-11'
draft: false
duree: 10 min
sources:
  - title: Google — Les déclencheurs installables (en anglais)
    url: https://developers.google.com/apps-script/guides/triggers/installable
  - title: Google — Quotas des services Apps Script (en anglais)
    url: https://developers.google.com/apps-script/guides/services/quotas
  - title: Google pour les associations
    url: https://www.google.com/intl/fr/nonprofits/
verifieLe: '2026-11-11'
---

## Le déclencheur : ce qui lance le script

Jusqu’ici, vous lanciez le script vous-même, avec le bouton **Exécuter** ou un menu. Un **déclencheur** le lance à votre place, quand quelque chose se produit :

- **À l’ouverture du tableau** : c’est la fonction `onOpen` du [premier script](/outils/atelier/premier-script/). Rien à installer, il suffit de lui donner ce nom.
- **À l’envoi d’un formulaire** : chaque nouvelle réponse lance le script. Idéal pour un mail de bienvenue.
- **À heure fixe** : tous les jours, toutes les semaines… Idéal pour une sauvegarde ou une relance.

Les deux derniers s’installent. Nos recettes le font pour vous avec une fonction `installer` : vous la choisissez dans la liste des fonctions de l’éditeur, vous cliquez sur **Exécuter**, et c’est fait. Vous pouvez la lancer deux fois sans risque, elle ne crée jamais de doublon.

Pour voir les déclencheurs en place : dans l’éditeur, l’icône en forme de **réveil**, à gauche.

## Qui est aux commandes ?

Un déclencheur tourne **au nom de la personne qui l’a installé**, avec ses droits et ses quotas. D’où le conseil du premier tuto : installez tout avec le compte de l’association. Sinon, le départ d’un bénévole arrête les automatisations sans que personne ne s’en rende compte.

## Quand ça plante

Un script lancé par un déclencheur n’a personne devant l’écran pour voir l’erreur. Deux endroits pour la retrouver :

- **Par mail** : Google écrit au propriétaire du déclencheur quand une exécution échoue. Dans la fenêtre du déclencheur, réglez **Paramètres de notification d’échec** sur **M’avertir immédiatement**, et vérifiez que quelqu’un lit cette boîte.
- **Dans l’historique** : l’icône **Exécutions** (une liste, à gauche de l’éditeur) affiche chaque lancement, sa durée et son éventuelle erreur.

Nos scripts écrivent leurs erreurs en français. Un message comme « Onglet « Événements » introuvable » vous dit directement quoi corriger.

## Les limites de Google

Google fixe des plafonds quotidiens. Ils sont larges pour une association, mais il faut les connaître, surtout pour les mails. Voici les principaux, tels que Google les publie au moment où nous écrivons :

| Limite | Compte Gmail gratuit | Google Workspace |
| --- | --- | --- |
| Destinataires de mails par jour | 100 | 1 500 |
| Durée d’une exécution | 6 minutes | 6 minutes |
| Temps total des déclencheurs par jour | 90 minutes | 6 heures |
| Déclencheurs par script et par personne | 20 | 20 |

Les compteurs repartent à zéro au bout d’une période de 24 heures, mais pas à minuit pile : l’heure exacte varie d’un compte à l’autre. Nos recettes d’envoi de mails vérifient ce qu’il reste avant de commencer, et s’arrêtent proprement si la limite est atteinte : vous relancez le lendemain et le script reprend là où il s’était arrêté.

> 🐒 **Le réflexe d’Octet** : votre association envoie plus de 100 mails par jour ? Google propose une offre gratuite aux associations éligibles, qui donne accès à Google Workspace et à ses limites plus hautes. Les conditions sont sur la page [Google pour les associations](https://www.google.com/intl/fr/nonprofits/).

## En résumé

- Un déclencheur lance le script à votre place : à l’ouverture, à chaque formulaire ou à heure fixe.
- Il tourne au nom de celui qui l’a installé : utilisez le compte de l’association.
- Activez les notifications d’échec et regardez l’historique des exécutions de temps en temps.
- 100 mails par jour avec un compte gratuit : au-delà, le script attend le lendemain.
