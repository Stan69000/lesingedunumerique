---
kind: recette
etagere: adherents
title: Une carte d’adhérent en PDF pour chaque ligne du tableau
description: Vous dessinez la carte une fois dans Google Docs. Le script la remplit pour chaque nouvel adhérent, l’enregistre en PDF dans Drive et note le lien dans le tableau.
pubDate: 2026-11-11
draft: true
niveau: 2
duree: 25 min
services: [Sheets, Docs, Drive]
declencheur: À la demande, depuis le menu 🐒 Octet du tableau
compteGratuit: Oui, dans la limite de l’espace Drive
donnees: contacts
autorisations:
  - droit: Afficher, modifier, créer et supprimer toutes vos feuilles de calcul Google Sheets
    pourquoi: lire les adhérents et noter le lien de chaque carte. Le script ne touche qu’à l’onglet indiqué, mais Google ne permet pas de limiter ce droit au seul tableau quand le script doit aussi ouvrir d’autres fichiers.
  - droit: Afficher, modifier, créer et supprimer tous vos documents Google Docs
    pourquoi: remplir la copie du modèle. Le modèle lui-même n’est jamais modifié.
  - droit: Consulter, modifier, créer et supprimer tous vos fichiers Google Drive
    pourquoi: copier le modèle, enregistrer le PDF dans le dossier des cartes et mettre la copie intermédiaire à la corbeille.
  - droit: Afficher et exécuter du contenu Web tiers dans les invites et les barres latérales des applications Google
    pourquoi: malgré son intitulé, c’est le droit d’afficher le menu 🐒 Octet, la confirmation et le bilan. Aucun contenu extérieur n’est chargé.
sources:
  - title: Google — Le service Document d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/reference/document/document-app
  - title: Google — Le service Drive d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/reference/drive/drive-app
  - title: CNIL — Guide de sensibilisation au RGPD pour les associations (PDF)
    url: https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf
---

## Avant / après

**Avant** : pour chaque adhésion, quelqu’un ouvre le modèle de carte, change le nom, la date, exporte en PDF, renomme le fichier, le range. Dix minutes par carte, et autant d’occasions de laisser le nom de l’adhérent précédent.

**Après** : un clic sur **🐒 Octet > Créer les cartes manquantes**. Chaque ligne sans carte reçoit son PDF, rangé dans un dossier Drive, avec son lien dans le tableau. Il ne reste qu’à l’envoyer ou l’imprimer.

> 🐒 **Le réflexe d’Octet** : cette recette demande des droits larges sur Docs, Drive et Sheets, parce qu’elle doit ouvrir trois fichiers différents. C’est une raison de plus pour l’installer avec le compte de l’association, et de [relire la liste des droits](/outils/atelier/autoriser-un-script-sans-paniquer/) avant d’autoriser.

## Ce qu’il vous faut

- **Le tableau des adhérents**, avec un onglet **Adhérents**, une ligne par personne et une colonne **Carte** vide. Les autres colonnes sont libres : Prénom, Nom, Numéro, Fin d'adhésion…
- **Un modèle Google Docs** : la carte telle que vous la voulez, logo et mise en page compris. À la place de chaque information, écrivez le titre de la colonne entre doubles accolades :

> **Carte d’adhérent 2026-2027**
> {{Prénom}} {{Nom}}
> Adhérent n° {{Numéro}} — valable jusqu’au {{Fin d'adhésion}}

- **Un dossier Drive** pour les cartes, partagé seulement avec les membres du bureau qui en ont besoin.

Astuce mise en page : dans le modèle, **Fichier > Configuration de la page** permet de choisir un petit format, ou de garder une page A4 à découper.

## 1. Coller le script

Dans le tableau, ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 2. Régler

Dans `REGLAGES` :

- `modele` : l’adresse du document modèle, copiée depuis le navigateur ;
- `dossier` : l’adresse du dossier des cartes ;
- `nomFichier` : le nom de chaque PDF, avec les mêmes {{champs}} ;
- `onglet` et `colonneCarte`, si vos noms diffèrent.

Enregistrez, revenez au tableau et rechargez la page : le menu **🐒 Octet** apparaît.

## 3. Créer les cartes

1. Pour un premier essai, laissez une seule ligne sans lien dans la colonne **Carte** : écrivez « essai » dans les autres pour que le script les saute.
2. **🐒 Octet > Créer les cartes manquantes**. Autorisez la première fois, puis relancez.
3. Ouvrez le PDF créé : mise en page, accents, dates. Si tout va bien, effacez les « essai » et relancez pour toutes les autres lignes.

## Ce que le script vérifie pour vous

- **Un {{champ}} inconnu** dans le modèle, par exemple {{Prenom}} sans accent : le script refuse de commencer et vous dit lequel corriger.
- **Les lignes déjà servies** : une ligne qui a un lien dans **Carte** n’est jamais refaite. Pour refaire une carte (nom mal orthographié), effacez son lien et relancez.
- **La limite de 6 minutes** de Google : au-delà d’une soixantaine de cartes, le script s’arrête proprement et vous demande de relancer pour la suite.

## Si ça ne marche pas

- **« Impossible de lire un identifiant Drive »** : l’adresse collée dans `modele` ou `dossier` est incomplète. Recopiez-la depuis la barre d’adresse.
- **Un champ reste affiché tel quel** sur la carte : Google Docs a coupé le texte en plusieurs morceaux de mise en forme (une partie en gras, par exemple). Retapez le {{champ}} d’un seul tenant, sans changer la mise en forme au milieu.
- **Les dates s’affichent mal** : vérifiez que la colonne contient de vraies dates (alignées à droite).

## Pour aller plus loin

- Les copies intermédiaires partent à la corbeille et y restent 30 jours : elles contiennent les mêmes informations que les cartes. Videz la corbeille du compte de temps en temps.
- Ne mettez sur la carte que le nécessaire : un nom, un numéro, une date de validité. Ni adresse, ni date de naissance.
