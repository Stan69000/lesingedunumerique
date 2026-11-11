---
kind: recette
etagere: adherents
title: Relancer les cotisations à échéance
description: Un rappel quinze jours avant la fin de l’adhésion, un second une semaine après. Chaque adhérent reçoit au plus deux messages, et le tableau garde la trace de chaque relance.
pubDate: 2026-11-11
draft: true
niveau: 2
duree: 20 min
services: [Sheets, Gmail]
declencheur: Tout seul, une fois par jour
compteGratuit: Oui, jusqu’à 100 relances par jour ; les suivantes partent le lendemain
donnees: contacts
autorisations:
  - droit: Afficher et gérer les feuilles de calcul auxquelles cette application a été associée
    pourquoi: lire les dates de fin d’adhésion et noter chaque relance, dans ce tableau seulement.
  - droit: Envoyer des e-mails en votre nom
    pourquoi: envoyer les relances. Le script ne peut pas lire votre boîte.
  - droit: Autoriser cette application à s’exécuter lorsque vous n’êtes pas présent
    pourquoi: passer chaque jour, même ordinateur éteint.
sources:
  - title: CNIL — Guide de sensibilisation au RGPD pour les associations (PDF)
    url: https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf
  - title: Google — Les déclencheurs installables (en anglais)
    url: https://developers.google.com/apps-script/guides/triggers/installable
  - title: Google — Le service MailApp (en anglais)
    url: https://developers.google.com/apps-script/reference/mail/mail-app
---

## Avant / après

**Avant** : chaque mois, le trésorier trie le fichier par date de fin, repère les adhésions qui expirent et écrit à chacun. Les mois chargés, la relance passe à la trappe et la cotisation avec.

**Après** : le script passe chaque matin. Quinze jours avant l’échéance, il envoie un rappel. Une semaine après, si la date n’a pas changé, il en envoie un second. Puis il s’arrête : personne ne reçoit de relances à vie.

## Ce qu’il vous faut

Un tableau Google Sheets avec un onglet **Adhérents** et au moins ces colonnes, dans l’ordre que vous voulez :

| Email | Prénom | Fin d'adhésion | Dernière relance | Pas de relance |
| --- | --- | --- | --- | --- |
| camille@exemple.fr | Camille | 31/01/2027 | | ☐ |
| dominique@exemple.fr | Dominique | 15/12/2026 | | ☑ |

- **Fin d'adhésion** contient une vraie date, alignée à droite dans sa case.
- **Dernière relance** reste vide : le script y écrit, par exemple, « avant 31/01/2027 ».
- **Pas de relance** est facultative. Insérez des cases à cocher (**Insertion > Case à cocher**) : une case cochée, et la personne ne reçoit plus rien.

Si vous avez déjà installé [le mail de bienvenue](/outils/atelier/bienvenue-adherents/), utilisez un tableau ou un onglet différent de celui des réponses au formulaire : on garde ainsi un fichier d’adhérents propre, tenu par le bureau.

## 1. Coller le script

Dans le tableau, ouvrez **Extensions > Apps Script**, effacez le contenu de l’éditeur et collez le script.

<!-- script -->

## 2. Régler

Dans `REGLAGES` :

- les noms de l’onglet et des colonnes, s’ils diffèrent des nôtres ;
- `joursAvant` et `joursApres` : le calendrier des deux relances ;
- `oublierApres` : au-delà de ce délai après l’échéance (60 jours par défaut), le script considère que la personne est partie et ne lui écrit plus. Sans ce garde-fou, le premier passage écrirait à tous les anciens adhérents du fichier ;
- `nomAsso`, `lienRenouvellement` (votre page HelloAsso, par exemple) et les textes ;
- `adresseTest` : votre adresse ;
- `heure` : l’heure du passage quotidien.

Enregistrez.

## 3. Vérifier avant d’activer

1. Lancez **testerRelance** (liste des fonctions, puis **Exécuter**). Autorisez ([l’écran expliqué](/outils/atelier/autoriser-un-script-sans-paniquer/)). Vous recevez les deux messages, adressés à « Camille ». Relisez-les.
2. Lancez **simulerRelances**. Le journal en bas de l’éditeur liste les personnes qui recevraient une relance aujourd’hui, **sans rien envoyer**. C’est le moment de repérer une date mal saisie ou un ancien adhérent oublié.
3. Si la liste vous convient, lancez **installer**. Les relances partiront dès le lendemain, à l’heure choisie.

Dans l’icône **Déclencheurs** (le réveil), réglez les **Paramètres de notification d’échec** sur **M’avertir immédiatement** : si une adresse est invalide, Google vous préviendra.

## Quand quelqu’un renouvelle

Mettez à jour sa **Fin d'adhésion**. C’est tout : le script compare la date notée dans « Dernière relance » à la nouvelle échéance, et les relances repartiront l’an prochain.

## Si ça ne marche pas

- **« Colonne introuvable »** : le titre dans `REGLAGES` ne correspond pas exactement à l’en-tête. Attention à l’apostrophe de « Fin d'adhésion » : droite (') dans le script, elle doit l’être aussi dans le tableau.
- **Personne n’est relancé** : vérifiez que les dates sont bien des dates. Une date alignée à gauche est du texte, que le script ignore.
- **Une personne répond « STOP »** : cochez sa case **Pas de relance**. Elle ne recevra plus rien, et c’est une obligation : chacun doit pouvoir s’opposer simplement à ces messages.

## Pour aller plus loin

- Vous préférez un seul rappel ? Mettez `joursApres` à une valeur plus grande que `oublierApres`.
- Les personnes qui n’ont pas renouvelé depuis longtemps n’ont plus leur place dans le fichier : une prochaine recette de l’étagère « Sécurité et entretien » s’occupera de les anonymiser.
