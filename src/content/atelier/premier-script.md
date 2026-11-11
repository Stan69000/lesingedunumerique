---
kind: premiers-pas
ordre: 1
title: Votre premier script en 10 minutes
description: Où se cache Apps Script, quel compte utiliser pour l’association, et un premier script qui ajoute un menu à votre tableau.
pubDate: '2026-11-11'
draft: true
duree: 10 min
services:
  - Sheets
sources:
  - title: Google — Présentation d’Apps Script (en anglais)
    url: https://developers.google.com/apps-script/overview
  - title: Google — Scripts liés à un document (en anglais)
    url: https://developers.google.com/apps-script/guides/bound
verifieLe: '2026-11-11'
---

## Apps Script, c’est quoi ?

C’est un langage fourni gratuitement par Google, rangé dans vos outils habituels. Un script, ce sont quelques lignes qui font à votre place ce que vous feriez à la main : copier une ligne, envoyer un mail, créer un événement dans l’agenda.

Il tourne **sur les serveurs de Google**, pas sur votre ordinateur. Vous pouvez éteindre votre machine : un script programmé pour le dimanche à 3 h se lancera quand même.

Il en existe deux sortes :

- **Le script lié** vit à l’intérieur d’un fichier, par exemple votre tableau des adhérents. On l’ouvre depuis ce fichier, et il disparaît avec lui. C’est le cas de la plupart de nos recettes.
- **Le script autonome** est un fichier à part dans Drive, créé depuis [script.google.com](https://script.google.com/). Il sert quand la tâche ne dépend d’aucun tableau, comme une sauvegarde.

## Avant de commencer : quel compte ?

C’est le choix le plus important, et on le fait souvent trop vite. **Un script agit au nom de la personne qui l’installe.** Si un bénévole l’installe avec son compte personnel puis quitte l’association, le script s’arrête, et les fichiers qui lui appartiennent peuvent partir avec lui.

> 🐒 **Le réflexe d’Octet** : installez les scripts avec le compte Google de l’association (par exemple `contact@votre-asso.fr` ou `votre.asso@gmail.com`). Activez la validation en deux étapes, rangez le mot de passe dans un gestionnaire partagé, et assurez-vous qu’au moins deux membres du bureau peuvent y accéder.

## Votre premier script

On va ajouter un menu « 🐒 Octet » à un tableau. C’est exactement ce que font plusieurs recettes de l’atelier.

1. Créez un nouveau tableau Google Sheets, vide, avec le compte de l’association.
2. Ouvrez le menu **Extensions > Apps Script**. Un nouvel onglet s’ouvre : c’est l’éditeur. Il contient déjà une fonction vide `myFunction`.
3. Effacez tout et collez ces lignes :

```js
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐒 Octet')
    .addItem('Dire bonjour', 'direBonjour')
    .addToUi();
}

function direBonjour() {
  SpreadsheetApp.getActive().toast('Bonjour de la part d’Octet !', '🐒', 5);
}
```

4. Enregistrez avec l’icône de disquette, ou **Ctrl + S** (**Cmd + S** sur Mac).
5. Revenez sur l’onglet du tableau et rechargez la page. Un menu **🐒 Octet** apparaît à droite de « Aide ».
6. Cliquez sur **🐒 Octet > Dire bonjour**. Google vous demande une autorisation : c’est normal, et c’est l’objet de [l’étape suivante](/outils/atelier/autoriser-un-script-sans-paniquer/). Une fois autorisé, relancez le menu : un petit message apparaît en bas à droite.

## Ce qui vient de se passer

- `onOpen` est un nom spécial : Google lance cette fonction **tout seul** à chaque ouverture du tableau. C’est elle qui construit le menu.
- `direBonjour` ne se lance que quand vous cliquez dessus.
- Le texte entre apostrophes (`'Dire bonjour'`) se modifie sans risque. Le reste, mieux vaut ne pas y toucher tant que vous n’êtes pas à l’aise.

## Les réglages, toujours en haut

Toutes nos recettes commencent par un bloc `REGLAGES` : le nom de votre association, le titre d’une colonne, l’adresse de réponse… C’est la seule partie à adapter. Si une recette vous demande de modifier autre chose, c’est que nous avons mal fait notre travail : [dites-le-nous](/contact/).
