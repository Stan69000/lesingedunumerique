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

## Publication hebdomadaire automatique

L’automatisation Codex « Brief hebdomadaire d’Octet — publication automatique » prépare l’édition chaque dimanche à 8 h (Europe/Paris). Elle couvre le dimanche précédent au samedi inclus, consulte des sources primaires et crée `src/content/briefs/AAAA-MM-JJ-arnaques.md` sur une branche dédiée. Elle reprend une PR existante pour éviter les doublons.

Depuis l’autorisation explicite du 26 octobre 2026, l’agent relit les faits et leurs sources, valide le build et l’affichage du dernier brief, puis attend la réussite de tous les contrôles GitHub requis sur le dernier commit. Il marque la PR prête et la fusionne en squash, sans intervention manuelle si ces conditions sont réunies. Il ne fusionne que la PR du brief de cette édition, jamais une modification extérieure à ce périmètre. Les protections de branche restent appliquées.

La fusion déclenche `Deploy O2Switch`. L’agent vérifie le déploiement, son contrôle de santé et la présence du brief sur `/veille/` et sur sa page avant d’annoncer sa publication. Une source insuffisante, un contrôle absent ou échoué, une modification humaine inattendue ou une panne de déploiement bloque la publication automatique et déclenche un signalement.

La planification reste gérée dans Codex, hors du dépôt. Elle dépend de l’application disponible et de ses accès aux sources et à GitHub ; ce dépôt n’exécute pas un générateur autonome côté serveur. Les notifications sont limitées à une publication effective ou à un problème nécessitant une action. L’import local reste utilisable manuellement et ne pousse ni ne fusionne à lui seul.
