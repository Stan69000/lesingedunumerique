---
title: >-
  Protéger son enfant en ligne sans se ruiner : le duo gratuit qui tient la
  route
description: >-
  Vous allez apprendre à protéger efficacement votre enfant en ligne,
  gratuitement, en combinant Google Family Link et NextDNS sur une tablette
  Android.
pubDate: '2026-07-27'
rubrique: Articles
tags:
  - Guide pratique
  - Familles
  - Cybersécurité
  - Jeunesse
author: Stan Bouchet
level: grandpublic
readingTime: 6 min de lecture
---

# Protéger son enfant en ligne sans se ruiner : le duo gratuit qui tient la route

*Un guide pratique du Singe du Numérique*

Vous venez de confier une tablette ou un smartphone à votre enfant, et une petite voix vous souffle : « Est-ce que je maîtrise vraiment ce qu'il va y faire ? » Bonne nouvelle : on peut mettre en place une protection sérieuse **sans payer un centime**, avec deux outils qui se complètent à merveille. Pas besoin d'un abonnement à 60 € par an dont on n'utilisera qu'un tiers des fonctions.

Cet article s'adresse aux parents d'enfants d'environ 8 à 12 ans, sur Android. On va démystifier tout ça ensemble, étape par étape.

## Le principe : deux couches valent mieux qu'une

Un bon contrôle parental, ce n'est pas un seul outil magique, c'est **deux couches qui se superposent** :

1. **Une couche "appareil"** : qui contrôle le temps d'écran, les applications installées, l'heure du coucher numérique. C'est le rôle de **Google Family Link**.
2. **Une couche "réseau"** : qui filtre ce qui rentre par internet — sites pour adultes, violence, pubs, arnaques — quel que soit le réseau utilisé (votre Wi-Fi, celui des copains, la 4G). C'est le rôle de **NextDNS**.

L'une sans l'autre laisse des trous. Ensemble, elles couvrent l'essentiel des situations pour un enfant de cet âge.

Et un rappel important avant de commencer : **aucun outil ne remplace la conversation**. Le meilleur réglage du monde ne vaut pas un accord clair, expliqué et discuté avec votre enfant sur les règles de la maison. Les outils sont là pour soutenir cet accord, pas pour espionner.

---

## Couche 1 — Google Family Link (et non, ce n'est pas Microsoft !)

Petite confusion fréquente : le contrôle parental de Google s'appelle **Family Link**. Microsoft, de son côté, propose « Family Safety », correct mais moins bien intégré au monde Android. Sur une tablette ou un téléphone Android, c'est Family Link qu'il faut privilégier.

### Ce que ça fait
- Créer un **compte Google supervisé** pour votre enfant.
- **Valider ou refuser** chaque installation d'application depuis le Play Store.
- Fixer des **limites de temps d'écran** par jour (on peut mettre moins le soir des devoirs).
- **Verrouiller l'appareil à distance** (l'heure du dodo, par exemple).
- Forcer les filtres de **recherche sécurisée** et de **YouTube**.

Le tout est **100 % gratuit** et **en français**. Bonus depuis 2026 : un enfant ne peut plus quitter tout seul la supervision à 13 ans — il faut désormais votre accord.

### Comment l'installer (en gros)
1. Sur **votre** téléphone : installez l'application **Family Link** (Play Store).
2. Créez un **compte Google pour votre enfant** via l'application : prénom, date de naissance, votre consentement parental.
3. Sur la tablette de l'enfant : déconnectez l'ancien compte s'il y en avait un, puis connectez le **nouveau compte supervisé**. Family Link se lie automatiquement au vôtre.
4. Dans votre tableau de bord, vous voyez maintenant apparaître son appareil. Réglez les limites de temps, les applications autorisées, l'heure de blocage.

> **Astuce :** tant que vous ne voyez pas le nom de l'enfant et l'heure de dernière utilisation dans votre tableau de bord, c'est que la liaison n'est pas terminée.

---

## Couche 2 — NextDNS, le filtre invisible qui suit l'appareil partout

NextDNS est un **service de filtrage au niveau du réseau**. Pour faire simple : chaque fois que la tablette veut ouvrir un site, elle demande d'abord « c'est quoi l'adresse de ce site ? » à un annuaire, le **DNS**. NextDNS est un annuaire intelligent qui peut répondre « ce site est bloqué » pour tout ce que vous jugez inapproprié.

Son gros avantage : une fois configuré **sur la tablette elle-même**, le filtrage s'applique **sur tous les réseaux** — votre Wi-Fi, celui de la copine, la connexion mobile. Contrairement à un filtrage posé uniquement sur votre box, il ne s'arrête pas à la porte de la maison.

Le service est **gratuit jusqu'à 300 000 requêtes par mois**, ce qui est largement suffisant pour l'usage d'un enfant, et l'interface est **en français**.

### Étape A — Créer un profil dédié à l'enfant
Dans votre compte NextDNS, vous pouvez créer **plusieurs profils**. Créez-en un **spécifique à votre enfant** (ne réutilisez pas le vôtre !). Chaque profil a son propre identifiant, du type `abc123.dns.nextdns.io` — retenez-le, il servira juste après.

L'intérêt d'un profil séparé : vos propres appareils gardent vos réglages, et l'historique de la tablette ne se mélange pas au vôtre.

### Étape B — Les réglages recommandés (pour une enfant d'environ 10 ans)

**Onglet Sécurité (Security)** — on peut tout activer, c'est sans inconvénient :
- Renseignements sur les menaces, navigation sécurisée Google, protection contre le cryptojacking, l'usurpation de domaine, les fautes de frappe (typosquatting).
- « Bloquer les domaines récemment enregistrés » : à activer, ça coupe une grande partie des sites d'arnaque.
- Blocage des contenus pédocriminels : activé, évidemment.

**Onglet Confidentialité (Privacy)** :
- Ajoutez **une** bonne liste de blocage des pubs et traceurs, par exemple **OISD**. Une seule liste solide vaut mieux que dix qui se chevauchent.
- Activez « Bloquer les traceurs tiers déguisés ».

**Onglet Contrôle parental (Parental Control)** — le cœur du sujet :
- Cochez les catégories à bloquer : **pornographie, jeux d'argent, sites de rencontre, piratage**. Les réseaux sociaux aussi, à cet âge, par défaut.
- Activez **SafeSearch** (recherche sécurisée) et **YouTube Restricted Mode** (mode restreint YouTube). Forcés ici, l'enfant ne peut pas les désactiver.
- **Activez « Block Bypass Methods » (bloquer les méthodes de contournement)** : c'est le réglage le plus important. Il coupe les VPN, proxys et DNS alternatifs qui permettraient de contourner tout le filtrage.
- Vous pouvez aussi bloquer des services précis (TikTok, Snapchat, Discord…) individuellement.

**Onglet Réglages (Settings)** :
- Activez les journaux (logs) avec une rétention courte (une semaine suffit) — pour pouvoir jeter un œil en cas de doute.
- Activez la « page de blocage » : votre enfant verra un message clair « site bloqué » plutôt qu'une erreur incompréhensible.

### Étape C — Activer NextDNS sur la tablette (le fameux « DNS privé »)

Sur Android, tout se joue dans un réglage qui s'appelle **DNS privé** :

1. Ouvrez **Paramètres → Réseau et Internet → DNS privé**.
2. Choisissez « Nom d'hôte du fournisseur DNS privé ».
3. Saisissez l'identifiant de votre profil enfant : `abc123.dns.nextdns.io` (le vôtre se trouve dans l'onglet « Setup » / « Configuration » de votre tableau de bord NextDNS).
4. Validez.

Et voilà : le filtrage s'applique désormais à toute la tablette. Cerise sur le gâteau — sur un compte supervisé par Family Link, l'enfant **ne peut pas modifier ce réglage** sans votre code parent. Le filtrage est verrouillé.

---

## Les trous à colmater (là où ça se joue vraiment)

Un contrôle parental efficace, c'est aussi anticiper les contournements. Trois réflexes :

- **Bloquer les applications VPN et les navigateurs alternatifs** dans le Play Store, via Family Link. Un VPN annule le filtrage réseau ; un navigateur comme Firefox peut ignorer les réglages du système.
- **Sur une tablette Samsung**, pensez à désactiver le navigateur « Samsung Internet » si vous voulez tout centraliser sur Chrome supervisé.
- **Tester la configuration** : depuis la tablette, ouvrez la page `test.nextdns.io`. Elle vous confirme que c'est bien le profil de votre enfant qui filtre.

---

## En résumé

| Besoin | Outil | Coût |
|---|---|---|
| Temps d'écran, applis, heure du coucher | Google Family Link | Gratuit |
| Filtrage des contenus, pubs, arnaques | NextDNS | Gratuit |
| Le plus important | La conversation avec votre enfant | Gratuit aussi 🙂 |

Avec ce duo, vous couvrez l'essentiel des situations pour un enfant de 8 à 12 ans, sur tous les réseaux, sans abonnement. Les solutions payantes (Qustodio, Xooloo et compagnie) apportent surtout du confort et des rapports plus détaillés — utiles à l'adolescence, rarement indispensables avant.

Prenez une demi-heure, installez tranquillement, testez, et surtout : **expliquez à votre enfant ce que vous mettez en place et pourquoi**. Un cadre expliqué est un cadre respecté.

---

*Un doute sur une étape ? Le Singe du Numérique organise des ateliers et répond à vos questions. La technique doit rester au service des familles, jamais l'inverse.*
