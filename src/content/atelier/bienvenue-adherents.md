---
kind: recette
etagere: adherents
title: Un mail de bienvenue à chaque nouvelle adhésion
description: Quelqu’un remplit votre formulaire d’adhésion, il reçoit dans la minute un mail de bienvenue personnalisé. Sans que personne n’ait à y penser.
pubDate: 2026-11-11
draft: true
niveau: 1
duree: 15 min
services: [Forms, Sheets, Gmail]
declencheur: Tout seul, à chaque réponse au formulaire
compteGratuit: Oui, jusqu’à 100 mails par jour
donnees: contacts
autorisations:
  - droit: Afficher et gérer les feuilles de calcul auxquelles cette application a été associée
    pourquoi: lire le prénom et l’adresse dans la réponse, et seulement dans ce tableau.
  - droit: Envoyer des e-mails en votre nom
    pourquoi: envoyer le mail de bienvenue. Le script ne peut pas lire votre boîte.
  - droit: Autoriser cette application à s’exécuter lorsque vous n’êtes pas présent
    pourquoi: se lancer tout seul à chaque nouvelle réponse.
sources:
  - title: Google — Déclencheur à l’envoi d’un formulaire (en anglais)
    url: https://developers.google.com/apps-script/guides/triggers/events#form-submit
  - title: Google — Le service MailApp (en anglais)
    url: https://developers.google.com/apps-script/reference/mail/mail-app
  - title: CNIL — Guide de sensibilisation au RGPD pour les associations (PDF)
    url: https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf
---

## Avant / après

**Avant** : un bénévole surveille les réponses du formulaire et écrit à chaque nouvel adhérent. Les jours chargés, certains attendent une semaine.

**Après** : le mail part tout seul, à chaque réponse, avec le prénom de la personne. Le bénévole garde son temps pour les vrais échanges.

## Ce qu’il vous faut

- Un **formulaire Google Forms** d’adhésion qui demande au moins le prénom et l’adresse e-mail.
- Ses réponses **enregistrées dans un tableau Google Sheets** : dans le formulaire, onglet **Réponses**, cliquez sur **Associer à Sheets**.
- Le tout avec le **compte Google de l’association** ([pourquoi ?](/outils/atelier/premier-script/)).

## 1. Repérer le titre des colonnes

Ouvrez le tableau des réponses. La première ligne reprend le titre de chaque question : par exemple « Prénom » et « Adresse e-mail ». Notez-les **exactement**, majuscules et accents compris : le script en aura besoin.

## 2. Coller le script

Dans le tableau, ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script ci-dessous.

<!-- script -->

## 3. Régler le texte

En haut du script, dans le bloc `REGLAGES` :

- `colonneEmail` et `colonnePrenom` : les titres notés à l’étape 1.
- `nomAsso` : le nom de votre association. Il sert de nom d’expéditeur.
- `objet` et `message` : le contenu du mail. Gardez `{prenom}` et `{asso}`, ils seront remplacés. Chaque ligne du message se met entre apostrophes et se termine par une virgule.
- `repondreA` : l’adresse qui recevra les réponses, si ce n’est pas celle qui envoie.
- `adresseTest` : votre adresse, pour l’essai.

Enregistrez (**Ctrl + S** ou **Cmd + S**).

## 4. Faire un essai

En haut de l’éditeur, choisissez **testerBienvenue** dans la liste des fonctions, puis cliquez sur **Exécuter**. Google demande l’autorisation la première fois ([l’écran expliqué](/outils/atelier/autoriser-un-script-sans-paniquer/)). Le mail d’essai arrive dans votre boîte, adressé à « Camille ». Relisez-le : fautes, ton, signature.

## 5. Installer le déclencheur

Choisissez **installer** dans la liste, puis **Exécuter**. Le message « C’est prêt » s’affiche dans le journal en bas.

Pour vérifier, répondez vous-même au formulaire avec votre adresse : le mail doit arriver dans la minute. Pensez ensuite à supprimer cette ligne d’essai du tableau.

## Si ça ne marche pas

- **« Colonne introuvable »** : le titre dans `REGLAGES` ne correspond pas exactement à l’en-tête du tableau. Copiez-collez-le depuis la première ligne.
- **Rien n’arrive** : regardez dans les spams, puis dans l’icône **Exécutions** de l’éditeur. Chaque réponse au formulaire doit y laisser une ligne.
- **Les réponses arrivées avant l’installation** ne reçoivent rien : le script ne réagit qu’aux nouvelles.

## Pour aller plus loin

- Ajoutez un lien vers votre règlement intérieur, votre groupe de discussion ou votre agenda dans le message.
- Le mail ne doit pas contenir d’informations que vous ne voudriez pas voir transférées : c’est un message de bienvenue, pas une fiche d’adhérent.
