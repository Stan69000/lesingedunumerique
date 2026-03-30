# Le Singe Du Numérique

Site Astro de l'association **Le Singe Du Numérique**.

Le site présente l'association, ses actions, ses événements, ses ressources et son blog. Il est construit comme un site statique Astro, avec un blog basé sur `astro:content`.

## Objectif du site

L'association a pour objet :

- la démocratisation et l'inclusion numérique pour tous les publics
- le soutien à la transformation numérique du tissu associatif local

Le site sert donc à :

- présenter la mission de l'association
- expliquer ses actions et ses priorités
- publier des ressources utiles
- structurer un blog avec les rubriques `Articles`, `Veille` et `Technos`

## Stack

- [Astro](https://astro.build/) pour la structure du site
- `astro:content` pour les contenus du blog
- CSS maison
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

Cela permet de partager la navigation, le footer et les métadonnées.

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
- `author`

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

## Administration du contenu

Une base d'administration `Decap CMS` est préparée pour le blog.

En local :

1. lancer le site avec `npm run dev`
2. lancer le backend local avec `npx decap-server`
3. ouvrir `/admin`

La mise en ligne de l'administration nécessite encore la configuration de
l'authentification et du workflow de publication.

## Accessibilité

Le site a déjà reçu plusieurs améliorations d'accessibilité. L'état public
reste documenté sur la page accessibilité du site et doit rester cohérent avec
les audits et tests réellement effectués.

## Licence

Le dépôt utilise une séparation claire :

- contenus éditoriaux et médias : **CC BY-NC-SA 4.0**
- code source et fichiers techniques : **droits réservés**
- logo, nom de l'association et identité visuelle : **droits réservés**

Voir :

- [LICENSE](./LICENSE)
- [LICENSE-CONTENT.md](./LICENSE-CONTENT.md)
