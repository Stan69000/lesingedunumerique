# Le Singe Du Numérique

Site Astro de l'association **Le Singe Du Numérique**.

Le site présente l'association, ses actions, ses événements, ses ressources et son blog. Il est construit comme un site statique Astro, avec un thème visuel personnalisé, un blog basé sur `astro:content` et quelques comportements client légers pour le thème clair/sombre et les filtres du blog.

## Objectif du site

L'association a pour objet :

- la démocratisation et l'inclusion numérique pour tous les publics
- le soutien à la transformation numérique du tissu associatif local

Le site sert donc à :

- présenter la mission de l'association
- expliquer ses actions et ses priorités
- publier des ressources utiles
- structurer un blog avec les rubriques `Articles`, `Veille` et `Technos`

## Stack technique

- [Astro](https://astro.build/) pour la structure du site
- `astro:content` pour les contenus du blog
- CSS maison dans les pages et styles globaux
- build statique généré dans `dist/`

## Structure du projet

```text
/
├── public/                 # assets publics (logo, favicon, etc.)
├── src/
│   ├── content/
│   │   └── blog/           # articles Markdown du blog
│   ├── layouts/            # layouts Astro partagés
│   ├── pages/              # pages du site
│   ├── styles/             # styles globaux
│   └── content.config.ts   # schéma des contenus astro:content
├── dist/                   # build statique généré
└── package.json
```

## Pages principales

- `/` : home page
- `/asso` : mission, objet et fonctionnement de l'association
- `/projets` : actions et accompagnements
- `/evenements` : rendez-vous et rencontres
- `/adhesion` : rejoindre ou solliciter l'association
- `/blog` : ressources, veille et technos
- `/accessibilite` : état accessibilité actuel
- `/mentions-legales` : informations légales

## Utilisation d'Astro dans ce projet

### Pages

Les pages du site sont dans `src/pages/`.

Exemples :

- `src/pages/index.astro`
- `src/pages/asso.astro`
- `src/pages/blog/index.astro`

Chaque fichier `.astro` devient une route.

### Layouts

Les pages internes réutilisent un layout commun dans `src/layouts/SiteLayout.astro`.

Cela permet de partager :

- la navigation
- le footer
- les métadonnées
- une partie du style commun

### Blog avec astro:content

Le blog utilise `astro:content`.

Les articles sont stockés dans :

- `src/content/blog/*.md`

Le schéma du contenu est défini dans :

- `src/content.config.ts`

Chaque article contient actuellement :

- `title`
- `description`
- `pubDate`
- `rubrique`
- `tags`
- `author` (optionnel)

Exemple minimal :

```md
---
title: "Mon article"
description: "Résumé court de l'article."
pubDate: 2026-03-29
rubrique: "Articles"
tags: ["Débutant", "Cybersécurité"]
author: "Le Singe Du Numérique"
---

# Titre

Contenu Markdown...
```

### Thème et interactions

Le site reste majoritairement statique.

Quelques interactions légères sont gérées côté client :

- bascule thème clair / sombre
- menu mobile
- filtres du blog
- animation légère du logo sur la home

## Commandes utiles

Depuis la racine du projet :

| Commande | Action |
| --- | --- |
| `npm install` | installe les dépendances |
| `npm run dev` | lance le serveur local sur `http://localhost:4321` |
| `npm run build` | génère le site statique dans `dist/` |
| `npm run preview` | prévisualise le build localement |

## Ajouter un article de blog

1. Créer un fichier Markdown dans `src/content/blog/`
2. Ajouter les métadonnées attendues
3. Choisir une rubrique parmi :
   - `Articles`
   - `Veille`
   - `Technos`
4. Ajouter des tags cohérents
5. Lancer `npm run build` pour vérifier que le schéma Astro est respecté

## Administration du contenu avec Decap CMS

Une base `Decap CMS` est préparée dans :

- `public/admin/index.html`
- `public/admin/config.yml`

Objectif actuel :

- préparer une interface d’administration pour le blog
- garder Git comme source de vérité
- séparer la mise en place locale de l’authentification de production

### Ce qui est prêt maintenant

- collection `blog` configurée pour `src/content/blog`
- champs compatibles avec `src/content.config.ts`
- médias du blog configurés dans `public/blog`
- interface accessible à l’URL `/admin`

### Ce qui reste à faire avant un usage public complet

- brancher l’authentification GitHub pour Decap CMS
- définir le workflow de publication
- relier clairement la publication Git au déploiement O2Switch

### Test local de l’admin

L’admin peut être préparée et testée localement avant la production.

1. lancer le site :
   - `npm run dev`
2. lancer le backend local Decap dans un autre terminal :
   - `npx decap-server`
3. ouvrir :
   - `http://localhost:4321/admin`

Le `local_backend: true` dans `public/admin/config.yml` permet ce mode local.

### Authentification de production

En production, l’admin ne sera pas réellement utilisable publiquement tant que la partie OAuth GitHub n’est pas branchée.

Dans `public/admin/config.yml`, ces lignes sont volontairement laissées à compléter plus tard :

- `base_url`
- `auth_endpoint`

Cela évite de faire croire que l’admin publique est déjà finalisée.

## Branches Git

Le travail se fait en général sur des branches `codex/...`, puis est fusionné dans `main`.

À ce jour, toutes les branches de travail listées ci-dessous ont déjà été fusionnées dans `main` :

- `codex/blog-theme`
- `codex/fix-blog`
- `codex/home-cleanup`
- `codex/home-level-tags`
- `codex/home-logo-motion`
- `codex/missing-pages`
- `codex/phase-2-wording`
- `codex/rgaa-foundations`

Elles peuvent donc être supprimées localement et, si tu veux, à distance aussi.

## Accessibilité

Le site a déjà reçu plusieurs améliorations d'accessibilité, mais l'état officiel reste documenté dans :

- `src/pages/accessibilite.astro`

Le statut affiché sur le site doit rester cohérent avec l'état réel des audits et tests utilisateurs.
