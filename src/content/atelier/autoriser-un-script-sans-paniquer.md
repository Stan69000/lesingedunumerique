---
kind: premiers-pas
ordre: 2
title: Autoriser un script sans paniquer
description: L’écran « Google n’a pas validé cette application » expliqué, les droits à lire avant de cliquer, et comment tout retirer.
pubDate: '2026-11-11'
draft: false
duree: 5 min
sources:
  - title: Google — Autorisations des scripts Apps Script (en anglais)
    url: https://developers.google.com/apps-script/guides/services/authorization
  - title: Google — Gérer les applications et services tiers connectés à votre compte
    url: https://support.google.com/accounts/answer/13533235?hl=fr
  - title: Cybermalveillance.gouv.fr — L’hameçonnage
    url: https://www.cybermalveillance.gouv.fr/tous-nos-contenus/fiches-reflexes/hameconnage-phishing
verifieLe: '2026-11-11'
---

## Pourquoi Google vous demande la permission

La première fois qu’un script veut toucher à vos données (un tableau, vos mails, votre agenda), Google s’arrête et vous demande votre accord. C’est une protection : sans elle, n’importe quel script pourrait agir en votre nom.

## L’écran pas à pas

1. **« Autorisation requise »** : cliquez sur **Examiner les autorisations**.
2. Choisissez le compte. Vérifiez que c’est bien **celui de l’association**, pas votre compte personnel.
3. **« Google n’a pas validé cette application »**. C’est l’écran qui fait peur. Il apparaît parce que le script n’a pas été soumis à Google pour une vérification officielle, ce qu’on ne fait que pour les applications publiées au grand public. Pour un script que vous venez de coller vous-même, c’est normal.
4. Cliquez sur **Paramètres avancés**, puis sur **Accéder à [nom du projet] (non sécurisé)**.
5. **La liste des droits.** C’est le moment important : lisez-la. Google propose parfois des cases à cocher, droit par droit. Cochez ceux que la recette annonce, sinon le script s’arrêtera faute d’autorisation.
6. Cliquez sur **Autoriser**.

> 🐒 **Le réflexe d’Octet** : l’avertissement de l’étape 3 n’est rassurant **que si vous savez d’où vient le script**. Si quelqu’un vous a envoyé un lien ou un script « à autoriser vite », arrêtez-vous là.

## Lire la liste des droits

Chaque recette de l’atelier affiche la liste exacte de ce qu’elle demande et pourquoi. Comparez avec ce que Google vous montre. Quelques repères :

| Ce que Google affiche | Ce que ça veut dire |
| --- | --- |
| Afficher et gérer les feuilles de calcul **auxquelles cette application a été associée** | Le script ne touche qu’au tableau dans lequel il est rangé. C’est le droit le plus limité. |
| Afficher, modifier, créer et supprimer **toutes** vos feuilles de calcul | Tous vos tableaux. À réserver aux scripts qui en ont vraiment besoin. |
| Envoyer des e-mails en votre nom | Le script peut envoyer, mais pas lire votre boîte. |
| Consulter, rédiger, envoyer et supprimer **définitivement tous vos e-mails** | Accès complet à Gmail. Rarement justifié pour une tâche simple. |
| Se connecter à un service externe | Le script peut envoyer des données sur Internet. Demandez-vous vers où. |

Nos recettes choisissent toujours le droit le plus étroit possible. Par exemple, pour envoyer des mails, elles utilisent `MailApp`, qui sait **envoyer** mais pas **lire** votre messagerie. Et quand elles commencent par la ligne `@OnlyCurrentDoc`, elles se limitent au tableau dans lequel elles sont rangées.

## Les signaux qui doivent vous arrêter

- **On vous presse.** « Copiez ce script et autorisez-le avant ce soir », même de la part d’un proche dont le compte a peut-être été piraté.
- **Les droits ne collent pas à la tâche.** Un script censé « mettre en forme un tableau » qui demande l’accès complet à Gmail ou à Drive.
- **Le code est illisible.** Des lignes incompréhensibles, très longues, sans commentaire, ou une adresse Internet inconnue après `UrlFetchApp`.
- **On vous demande de partager l’écran ou un code reçu par SMS** pour « finir l’installation ». Aucune recette n’en a besoin.

Faire autoriser une application malveillante est une variante de l’hameçonnage : pas besoin de voler votre mot de passe si vous donnez vous-même les clés.

## Tout retirer, à tout moment

Vous changez d’avis, ou un bénévole quitte l’association ? Ouvrez [votre compte Google, rubrique « Applications et services tiers »](https://myaccount.google.com/connections). Chaque script autorisé y figure sous son nom de projet. Cliquez dessus, puis **Supprimer tous les accès**. Le script ne pourra plus rien faire tant qu’on ne l’aura pas autorisé à nouveau.

Faites-y un tour une fois par an : c’est souvent l’occasion de découvrir des accès oubliés.
