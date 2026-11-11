---
kind: recette
etagere: communication
title: Un mail personnalisé à chaque personne du tableau
description: Le même message, envoyé à chacun séparément avec son prénom, son créneau ou son montant. Personne ne voit les adresses des autres, et le script sait où il s’est arrêté.
pubDate: 2026-11-11
draft: true
niveau: 1
duree: 20 min
services: [Sheets, Gmail]
declencheur: À la demande, depuis le menu 🐒 Octet du tableau
compteGratuit: Oui, 100 destinataires par jour ; le script reprend le lendemain
donnees: contacts
autorisations:
  - droit: Afficher et gérer les feuilles de calcul auxquelles cette application a été associée
    pourquoi: lire les destinataires et le message, et noter la date d’envoi, dans ce tableau seulement.
  - droit: Envoyer des e-mails en votre nom
    pourquoi: envoyer les messages. Le script ne peut pas lire votre boîte.
  - droit: Afficher et exécuter du contenu Web tiers dans les invites et les barres latérales des applications Google
    pourquoi: malgré son intitulé, c’est le droit d’afficher le menu 🐒 Octet, la demande de confirmation et le bilan. Aucun contenu extérieur n’est chargé.
sources:
  - title: CNIL — Guide de sensibilisation au RGPD pour les associations (PDF)
    url: https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf
  - title: Google — Quotas des services Apps Script (en anglais)
    url: https://developers.google.com/apps-script/guides/services/quotas
---

## Avant / après

**Avant** : un mail à 60 bénévoles, adresses en copie visible (tout le monde voit l’adresse de tout le monde), ou 60 mails écrits à la main.

**Après** : chacun reçoit **son** mail, avec son prénom et ses informations. Le tableau garde la date d’envoi de chaque message : impossible d’écrire deux fois à la même personne par erreur.

> 🐒 **Le réflexe d’Octet** : mettre 60 adresses en copie visible, c’est communiquer des données personnelles à 60 personnes. Avec ce script, la question ne se pose plus.

## Ce qu’il vous faut

Un tableau Google Sheets avec deux onglets.

**L’onglet « Destinataires »**, une ligne par personne. Deux colonnes sont obligatoires, **Email** et **Envoyé le** (laissez celle-ci vide). Ajoutez toutes les colonnes utiles :

| Email | Prénom | Créneau | Envoyé le |
| --- | --- | --- | --- |
| camille@exemple.fr | Camille | samedi 9 h – 12 h | |
| dominique@exemple.fr | Dominique | dimanche 14 h – 17 h | |

**L’onglet « Message »** : en **A1** écrivez « Objet » et en **B1** l’objet du mail ; en **A2** écrivez « Texte » et en **B2** le message. Pour aller à la ligne dans une case, faites **Ctrl + Entrée** (**Cmd + Entrée** sur Mac).

Pour insérer une information de la ligne, écrivez le titre de sa colonne entre doubles accolades :

> Bonjour {{Prénom}},
> Merci de votre aide pour la fête de quartier ! Votre créneau : {{Créneau}}.

## 1. Coller le script

Ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 2. Régler, essayer, envoyer

1. Si vos onglets ou vos colonnes portent d’autres noms, adaptez `REGLAGES`. Renseignez `nomExpediteur` (par exemple le nom de l’association) et `repondreA` si besoin.
2. Enregistrez, revenez au tableau et rechargez la page : le menu **🐒 Octet** apparaît.
3. **Toujours un essai d’abord** : **🐒 Octet > Envoyer un essai à moi**. Indiquez votre adresse. Vous recevez le message rempli avec la première ligne du tableau. Relisez-le.
4. **🐒 Octet > Envoyer à tous les destinataires**. Le script annonce combien de messages vont partir et demande confirmation.
5. La colonne **Envoyé le** se remplit au fur et à mesure.

## Ce que le script vérifie pour vous

- **Un champ inconnu** comme `{{Prenom}}` sans accent alors que la colonne s’appelle « Prénom » : le script refuse d’envoyer et vous dit lequel corriger. Aucun destinataire ne recevra un « Bonjour {{Prenom}} ».
- **La limite quotidienne** : avec un compte gratuit, Google autorise 100 destinataires par jour. Au-delà, le script envoie ce qu’il peut et vous dit de relancer le lendemain. Il reprend aux lignes dont la case « Envoyé le » est vide.
- **Une adresse invalide** : la ligne est marquée ⚠️ avec l’erreur, les autres partent normalement. Corrigez l’adresse, effacez la case et relancez.

## Pour réutiliser le tableau

Pour un nouvel envoi aux mêmes personnes, changez le message puis videz la colonne **Envoyé le**. Pour un envoi régulier type lettre d’information, ajoutez une phrase pour se désinscrire et retirez du tableau les personnes qui le demandent.
