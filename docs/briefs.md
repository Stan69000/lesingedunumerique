# Ajouter un décryptage d’Octet

La source de vérité est `src/content/briefs/*.md`. Aucun changement d’interface ni service supplémentaire n’est nécessaire. Le modèle reste hors de la collection pour ne jamais devenir un article public.

## Depuis un brief texte

1. Créer une branche dédiée depuis `main` à jour.
2. Copier `templates/brief-weekly.md` hors de la collection (par exemple `/tmp/mon-brief.md`). Remplacer tous les exemples, dates, titres et liens ; coller le texte dans le corps Markdown. Vérifier les faits et les sources. Ne pas transformer une ancienne alerte en actualité récente sans preuve.
3. Garder `draft: true` pendant la préparation. Mettre explicitement `draft: false` après relecture pour publier ; garder `demo: false` pour un vrai brief.
4. Installer les dépendances avec `npm ci`, puis importer depuis la racine :

   ```sh
   npm run brief:add -- /tmp/mon-brief.md 2026-10-19-arnaques.md
   ```

5. Examiner le diff et le résultat avec `npm run preview`, puis committer le Markdown et ouvrir une PR. La CI existante exécute aussi le build. La fusion après validation déclenche le déploiement existant ; l’import ne committe, ne pousse et ne fusionne rien.

L’import exige une branche dédiée, un nom daté sans chemin, un corps non vide et refuse tout écrasement. Il lance `npm run build` : Astro valide le schéma existant (dates, période ordonnée, au moins une arnaque et une source HTTPS). En cas d’échec, seul le nouveau fichier est retiré ; le fichier source est conservé. Les sorties du build peuvent rester dans `dist/` : relancer un build après correction avant prévisualisation.

Pour corriger un brief déjà versionné, éditer directement son Markdown sur une branche et lancer `npm run build`. L’import n’est pas un éditeur et ne modifie pas les anciens briefs.

## Contrat Markdown

Le frontmatter YAML doit contenir `title`, `description`, `pubDate`, `periodStart`, `periodEnd`, `scams` (objets `id` / `name`) et `sources` (objets `title` / `url` HTTPS). Utiliser des dates ISO `AAAA-MM-JJ`, des identifiants d’arnaques uniques en minuscules et tirets, et du Markdown sans HTML ni script. `type` accepte `weekly`, `monthly` ou `evergreen`. La référence complète reste `src/content.config.ts` et le brief existant dans `src/content/briefs/`.

`getPublishedBriefs()` sélectionne les fichiers non brouillons dont `pubDate` est passée au moment du build, triés par date décroissante (puis identifiant en cas d’égalité). Le premier alimente `/veille/` ; les autres restent dans `/veille/briefs/`. Un brief futur n’apparaît qu’après un nouveau build et déploiement à partir de sa date. Préférer une date de publication différente pour chaque édition.

Le libellé existant dépend du type : `weekly` affiche « Hebdomadaire », `evergreen` affiche « Conseils pratiques ». Le design reste identique.

## Automatisation ultérieure

Une conversation ChatGPT seule n’écrit pas dans GitHub. Il reste à connecter un producteur autorisé (intégration GitHub ou workflow avec appel à une API de génération) qui prépare le même fichier Markdown, crée une branche et une PR, et attend la CI et la relecture humaine. Limiter les droits au dépôt, conserver les clés dans les secrets GitHub et prévenir les doublons par un nom stable d’édition. Ne pas connecter une entrée externe à une fusion automatique.

Le déploiement existant après fusion et le workflow de reconstruction peuvent être réutilisés ; aucun secret ni planification nouvelle n’est ajouté ici.
