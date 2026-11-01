# La Boussole d’Octet — première version

Route : `/outils/boussole/`. Moteur 0.1.0. Le rapport décrit une page et ne constitue pas un audit exhaustif du site.

## Fonctionnement livré

- Page Astro intégrée au site, au pied de page, au plan du site et au sitemap.
- Formulaire sans compte, objectif contextualisé, conseils selon l’outil de publication.
- Moteur PHP commun à l’API et à la CLI : 11 contrôles, preuves, sources, actions et limites.
- HTML initial uniquement ; aucun navigateur distant ni fournisseur IA.
- Rapport web filtrable, nouvelle analyse, exports Markdown/JSON/consignes IA.
- Impression adaptée : enregistrer en PDF dans le navigateur, tous les constats inclus. Pas de génération serveur de PDF à ce stade.
- Pas de stockage des rapports, ni de clé IA nécessaire. Les journaux de l’hébergeur restent applicables.

## Exécution

Prérequis : PHP 8.1 ou supérieur, extensions cURL et DOM ; Node selon la version du dépôt pour Astro.

```sh
npm run test:boussole
npm run audit:page -- https://lesingedunumerique.fr --goal=association
npm run build
php -S 127.0.0.1:4322 -t dist
```

Ouvrir `http://127.0.0.1:4322/outils/boussole/`. `astro dev` ne sait pas exécuter l’API PHP : utiliser le build et un serveur PHP pour un essai complet. Le script CLI écrit le JSON sur stdout et les erreurs sur stderr ; code de sortie 1 en cas d’échec. Les objectifs acceptés sont `association`, `activite`, `publication`.

## Réseau et limites d’exploitation

- HTTP(S) public, IPv4 uniquement ; noms de domaine ASCII, pas d’IP littérale, identifiants, paramètres de requête ni port non standard.
- Validation de toutes les IPv4 résolues et épinglage de la destination cURL pour prévenir le rebinding DNS. Pas de proxy ambiant ni de suivi automatique des redirections.
- Chaque redirection est à nouveau validée ; maximum 3, et aucun retour de HTTPS vers HTTP.
- Lecture prudente de robots.txt : blocage sur une règle Disallow applicable à `*` ou `OctetAudit`, même en présence d’exceptions Allow. Les réponses 404/410 sont acceptées ; les autres erreurs et redirections arrêtent l’audit. Ce comportement conservateur peut refuser des sites pourtant explorables par d’autres outils.
- Timeout de 10 secondes par requête, 1,5 Mo maximum par corps décompressé ; au plus 4 pages de redirection et un robots.txt par origine.
- API : JSON POST uniquement, plafond 4 Ko, 10 tentatives/IP/heure et 100 globales/heure (fenêtres calendaires UTC). Le proxy doit transmettre une adresse client fiable dans REMOTE_ADDR ; X-Forwarded-For n’est pas utilisé.
- Un seul audit réseau simultané. Les limites sont basées sur des fichiers temporaires et supposent une seule instance serveur. Empreintes IP horaires sans IP brute ni URL ; nettoyage opportuniste après deux heures.
- La CLI applique les restrictions de destination et robots.txt mais pas les quotas de l’API.
- Les textes distants sont affichés avec textContent, sans insertion HTML. Les exports avertissent l’IA de traiter les preuves comme des données non fiables.

## Déploiement et VPS

Le code est dans le dépôt existant. Le workflow de production O2Switch copie `dist/` et ses fichiers PHP après une publication sur main. Aucun changement serveur n’est nécessaire si cURL et DOM y sont disponibles. Vérifier ces modules et un audit réel avant d’annoncer l’ouverture publique.

L’API reste relative (`/boussole/audit.php`). Pour déplacer le moteur sur le VPS, utiliser un reverse proxy sur ce chemin : l’interface reste sur le site du Singe, et le navigateur n’a pas besoin d’accès interdomaines. Le moteur PHP actuel est transportable ; les futures tâches longues peuvent utiliser un service distinct.

Architecture cible à dimensionner après inventaire du VPS : API → file de travaux → workers d’exploration et navigateur isolé → stockage des rapports. Les navigateurs et rendus JavaScript exigent un filtrage réseau au niveau du conteneur : la protection cURL actuelle ne protège pas un futur navigateur.

La commande `ssh veille` a été tentée pendant cette réalisation ; le réseau de la session l’a refusée avant authentification. Aucun inventaire ni déploiement VPS n’a eu lieu.

## À construire ensuite

1. Vérification visuelle et audit HTTP réel sur un serveur accessible ; tests de bout en bout des exports et de l’impression.
2. Inventaire CPU/RAM/disque, services et reverse proxy du VPS, puis dimensionnement.
3. Exploration limitée multi-pages, tâches en arrière-plan et rendu JavaScript isolé.
4. PDF serveur, historique volontaire avec durée de conservation, comparaison entre audits.
5. Mesures de visibilité réelles, connecteurs, extension Chrome et CLI distribuable.

La CLI actuelle est un script du dépôt, pas encore un paquet installable. L’extension Chrome et les citations IA ne sont pas implémentées. Aucun score de classement ou de « probabilité de citation » n’est calculé.

## Sources des règles

Les sources sont attachées à chaque constat : Google Search Central (titres, extraits, robots, canonique, mobile, données structurées, contenus utiles, fonctions IA), W3C WAI (images, langue). Présence d’un champ, validité JSON, conformité métier et qualité éditoriale sont des observations distinctes. L’absence d’un canonique ou de JSON-LD n’est pas automatiquement considérée comme une erreur.

## Installation isolée sur le VPS (moteur seul)

L’inventaire fourni le 31 octobre 2026 indique Ubuntu 24.04, 4 CPU, 7,8 Gio de RAM (2,6 disponibles), 75 Go de disque disponibles, Docker et Caddy. PHP n’est pas installé sur l’hôte. La swap occupée (1,7/2 Gio) justifie une mesure avec `vmstat`, sans démontrer à elle seule une pression actuelle.

La configuration `deploy/boussole/compose.yaml` utilise l’image officielle PHP 8.4 Apache, sans compilation d’extensions. Le build vérifie cURL et DOM et s’arrête si nécessaire. Limites de fonctionnement : 384 Mio de mémoire sans swap supplémentaire, 0,5 CPU, 2 processus Apache, une seule analyse réseau. Le build lui-même n’est pas limité par ces contraintes d’exécution. Le port 3012 n’apparaît pas dans l’inventaire fourni : vérifier à nouveau avant démarrage.

Depuis le Mac, à la racine du dépôt :

```sh
ssh veille 'mkdir -p ~/boussole-octet/public ~/boussole-octet/deploy'
scp -r public/boussole veille:boussole-octet/public/
scp -r deploy/boussole veille:boussole-octet/deploy/
```

Puis sur le VPS :

```sh
cd ~/boussole-octet
docker compose version
ss -ltn 'sport = :3012'
docker stats --no-stream
vmstat 1 5
docker compose -f deploy/boussole/compose.yaml config --quiet
docker compose -f deploy/boussole/compose.yaml up -d --build
docker compose -f deploy/boussole/compose.yaml ps
curl -i http://127.0.0.1:3012/boussole/audit.php
curl --max-time 100 -sS -H 'Content-Type: application/json' --data '{"url":"https://lesingedunumerique.fr/","goal":"association"}' http://127.0.0.1:3012/boussole/audit.php
```

Le premier GET doit répondre 405 avec du JSON. Le POST doit renvoyer un rapport, ou une erreur explicite liée à la page et aux règles du moteur. Ne pas continuer si le port est occupé. Inspecter les logs en cas d’échec : `docker compose -f deploy/boussole/compose.yaml logs --tail=60`.

Arrêt réversible de ce service uniquement :

```sh
docker compose -f deploy/boussole/compose.yaml down
```

Cette étape n’expose pas le moteur publiquement et ne modifie pas Caddy. Pour raccorder le site O2Switch à ce moteur, il faut ensuite choisir et configurer un relais serveur authentifié (quotas et identité client à adapter) ou héberger l’interface et l’API ensemble sur un sous-domaine. Le Caddy du VPS ne peut pas, à lui seul, intercepter les requêtes du domaine hébergé chez O2Switch. Aucun raccordement public n’est encore livré.

La validation locale couvre la syntaxe PHP et les tests du moteur. Docker n’est pas disponible dans l’environnement de développement : ni construction ni démarrage du conteneur n’ont été vérifiés ici.

## Démonstration avant publication

- Sur la page : bouton « Essayer avec un exemple fictif », ou `/outils/boussole/?demo=1`.
- Aperçu autonome : `previews/boussole-demo.html`, à ouvrir directement dans un navigateur, sans PHP, serveur ou connexion.
- Le mode autonome ne lance jamais l’API ; l’adresse fictive est en lecture seule. Les boutons avant/après, les filtres et les exports réutilisent l’interface réelle. Le PDF passe par l’impression du navigateur.
- Les résultats viennent du moteur exécuté sur deux petits fichiers HTML fictifs dans `tests/fixtures`. Aucun diagnostic de site réel ne doit être déduit de cet exemple.
- Les rapports et exports portent le marquage SIMULATION, y compris le JSON (`demo: true`).

Régénération après modification :

```sh
php scripts/boussole-demo.php > src/data/boussole-demo.json
npm run build
python3 scripts/boussole-standalone.py
```

Le build, les 32 contrôles existants, les marqueurs de simulation et la syntaxe du JavaScript autonome ont été vérifiés. L’ouverture automatique du fichier local par le navigateur de contrôle est interdite par sa politique d’URL ; la validation visuelle et les essais des téléchargements restent à effectuer manuellement.

## Accompagnement et lexique SEO/GEO

La Boussole propose désormais un plan de trois actions ou une sélection respectant un budget indicatif total de 15 minutes. La sélection se limite aux actions et suggestions ; les décisions humaines (par exemple un noindex volontaire) ne sont pas transformées en corrections automatiques. Les cases cochées déclarent une action effectuée mais ne changent pas les résultats du moteur. Ce suivi reste en mémoire dans l’onglet et est ajouté aux exports sous une forme explicitement non vérifiée.

32 définitions sourcées sont disponibles dans `src/data/lexique-seo.json`, à la fois dans `/lexique-seo/`, le lexique général et la Boussole. Chaque constat renvoie à ses mots utiles. Les fiches comprennent une définition, une situation, le réflexe d’Octet et une source primaire. La recherche globale indexe aussi ces entrées. Le composant partagé `LexiqueExplorer.astro` conserve les recherches, thèmes et liens directs du lexique initial.

Le vocabulaire utile figure également dans l’export JSON. Le mode d’analyse reste limité à une page HTML : cet enrichissement n’ajoute pas d’exploration multi-pages, de mesure de citations ni d’IA distante.

Deux aperçus locaux sans serveur :

- `previews/boussole-demo.html` : exemple fictif avant/après, plan d’action, filtres, vocabulaire et exports.
- `previews/lexique-seo-demo.html` : les 32 fiches éditoriales et leur recherche (le contenu du lexique n’est pas fictif).

```sh
npm run test:boussole
npm run build
python3 scripts/boussole-standalone.py
python3 scripts/boussole-standalone.py --lexique
```

Validation : build de 74 pages, 32 contrôles PHP et 4 tests Node sur le budget d’actions, la séparation du suivi et du diagnostic, la correspondance des termes et les sources ; vérification des ancres uniques, des 113 entrées dans la recherche générale et de la syntaxe des deux JavaScript autonomes. Validation visuelle et essais navigateur des exports restent à faire ; aucun déploiement effectué.

## Lexique commun : numérique, SEO/GEO et accessibilité

La page principale `/lexique/` réunit désormais 137 fiches : 81 existantes, 32 SEO/GEO et 24 nouvelles sur l’accessibilité/RGAA. Un filtre « univers » se combine avec la recherche et les thèmes. Les termes transversaux sont associés à plusieurs univers sans duplication de fiche ni d’ancre. Le paramètre `?univers=seo` ou `?univers=accessibilite` ouvre un univers ; les changements de filtre mettent à jour l’adresse. Un lien direct vers une fiche masquée réinitialise les filtres nécessaires pour la révéler.

L’ancien point d’entrée `/lexique-seo/` renvoie à `/lexique/?univers=seo`. Le pied de page présente une entrée générale pour le lexique. Le lexique d’accessibilité renvoie aux sources officielles RGAA et W3C WAI ainsi qu’au projet de pré-audit de l’association. Il ne constitue pas une attestation de conformité.

L’aperçu complet est `previews/lexique-demo.html`. L’ancien fichier `previews/lexique-seo-demo.html` est maintenu avec le même contenu commun pour les liens déjà partagés. Les tests couvrent la présence d’un terme dans plusieurs univers, les recherches avec accents/synonymes et la combinaison des filtres. Build de 74 pages, 32 contrôles PHP et 8 tests Node validés ; les 137 fiches et leurs ancres sont présentes dans le build et la recherche. Le rendu visuel et les interactions navigateur restent à valider manuellement. Rien n’a été publié.

## Arnaques et jargon IA

Le lexique commun atteint 205 fiches après ajout de 44 fiches « Arnaques et manipulation » et de 16 fiches techniques. Les entrées antérieures rejoignent les filtres utiles sans duplication : 57 fiches sont visibles dans l’univers arnaques et 29 dans le jargon. Les cinq univers restent combinables avec les thèmes et la recherche. Des expressions du quotidien, conservées dans le champ `recherches`, permettent notamment de retrouver la demande de secret ou l’engrenage des paiements. Ce champ est aussi intégré à la recherche générale.

Les intitulés de manipulation décrivent des situations observables, pas des diagnostics psychologiques. Une note éditoriale le précise et oriente vers 17Cyber. Les sources sont Cybermalveillance.gouv.fr, l’AMF et la DGCCRF ; chaque fiche garde sa situation et son réflexe. Les pages sources non résolues pendant la rédaction ont été remplacées par des références identifiées (notamment location, cagnotte, chèque et sextorsion).

MCP, API, SDK, webhook, endpoint, connecteur, LLM, RAG, agent IA, token d’IA, jeton d’accès, OAuth, CLI, Docker, VPS et base de données sont définis avec des exemples et des limites. Les jetons d’accès sont distingués des tokens de texte, et MCP n’est pas présenté comme un accès automatique aux applications.

Validation : 32 contrôles PHP et 11 tests Node réussis, build de 74 pages, 205 fiches dans l’index et la page, ancres uniques et syntaxe des deux aperçus autonomes vérifiées. Rien n’a été publié ; rendu navigateur à vérifier manuellement.

## Liens entre le lexique et les contenus existants

Une sélection éditoriale dans `src/data/lexique-relations.json` ajoute 67 associations entre 48 termes et 14 contenus relus : huit articles, quatre BD et deux décryptages arnaques. Chaque relation correspond à un sujet effectivement expliqué ou illustré ; aucune association d’article n’est inventée pour MCP, JSON ou RAG. Les références officielles et les liens antérieurs sont conservés, sans doublon de destination.

Le catalogue commun `src/lib/lexique.ts` alimente la page, la recherche et les encadrés des contenus. Une fiche peut proposer plusieurs lectures. `LexiqueRelated` consulte désormais les cinq univers et toutes les destinations ; après six termes, les autres restent accessibles dans un volet dépliable. Les décryptages publiés affichent aussi cet encadré, à l’exclusion des démonstrations.

Validation : 32 contrôles PHP et 13 tests Node réussis ; build de 74 pages. Vérification des 67 relations dans les deux sens sur le HTML généré, des 205 fiches de recherche et de la syntaxe JavaScript des deux aperçus autonomes régénérés. Rendu visuel et interactions navigateur à vérifier manuellement ; aucun déploiement.

## Publication : accueil, outils et article

La Boussole rejoint le catalogue partagé des projets (accueil, association et pied de page). Une entrée « Nos outils » mène à `/outils/`, avec la Boussole et RGAA Audit. L’article `/blog/votre-site-est-en-ligne-octet-sort-sa-boussole/` explique le fonctionnement, les exports et les limites ; il est relié à l’outil et au lexique. Le compteur du lexique sur l’accueil utilise désormais le catalogue commun de 205 termes.

Les fichiers récents de main ont été intégrés avant publication, notamment la mesure d’audience et l’article RGAA Audit. Les relations éditoriales couvrent désormais 88 associations, 16 contenus et les nouvelles lectures SEO et accessibilité. Les tests sont aussi exécutés en CI et avant le déploiement. Un contrôle de production supplémentaire vérifie les pages, la réponse JSON 405 à un GET et un audit réel de la page d’accueil (11 constats), depuis le runner GitHub autorisé à accéder au réseau.


## Clarification des résultats et des prochaines étapes — moteur 0.1.1

Le rapport place désormais « Ce que l’outil a trouvé », puis « Que faire maintenant ? » avant l’explication. Les identifiants techniques restent dans le détail. Les actions sont visibles aussi pour les contrôles effectués, avec une consigne explicite de ne rien changer quand elle est adaptée. Plusieurs conseils indiquent où intervenir dans l’outil de publication ou fournissent un message à transmettre à la personne qui maintient le site.

Le contrôle de l’adresse déclarée aux moteurs ne demande plus systématiquement une confirmation. Une seule adresse HTTP(S) complète, sans fragment ni attribut annexe incompatible, identique à celle de la page analysée est reconnue comme cohérente. L’absence de barre oblique à la racine, la casse du domaine et le port par défaut sont normalisés ; la différence www, le protocole, les paramètres et la barre finale des chemins internes restent distincts. Ce contrôle ne vérifie ni la disponibilité de la destination ni le choix retenu par Google. Les adresses relatives, incomplètes ou multiples demandent une confirmation technique. L’absence de déclaration HTML est une suggestion conditionnelle, pas une erreur automatique ; les en-têtes Link ne sont pas analysés.

La fiche « URL canonique » est reformulée avec un exemple par page et un réflexe concret. Le périmètre du bilan est expliqué sous trois angles (fonctionnement, contenu, recommandations d’autres sites), avec renvoi à France Num. Ces repères sont reformulés pour le public du Singe ; ils n’ajoutent aucune mesure de popularité, de vitesse ou de trafic et ne constituent pas une approbation de France Num.

Validation locale : 50 contrôles PHP dont 18 cas de régression sur les adresses déclarées, 14 tests Node et build de 77 pages. Les exemples avant/après et les aperçus autonomes sont régénérés avec le moteur 0.1.1.

Une déclaration d’adresse absente, qui ne nécessite pas systématiquement une modification, est exclue des trois premières pistes d’action. Un test vérifie qu’elle ne prend pas la place d’une correction utile.


## Définitions accessibles directement depuis le rapport

Les termes SEO/GEO reconnus dans les constats, les conseils et le plan d’action deviennent des liens vers les définitions intégrées à la page. Les adresses web sont conservées intactes ; les textes reçus ne sont jamais interprétés comme du HTML. Les mots utiles associés à un contrôle sont également visibles sous celui-ci, au lieu d’être dissimulés dans une section dépliable. Le clic efface le filtre du lexique, ouvre la bonne définition et place le focus sur son intitulé. Les textes exportés restent inchangés.

Deux tests supplémentaires couvrent les synonymes, la casse, les mots complets, les adresses non découpées et le maintien du balisage comme texte. Total : 50 contrôles PHP et 16 tests Node.


## Exploration bornée (0.2.0)

Deux modes : une page ou un échantillon du site. Le navigateur orchestre au maximum 5 appels séquentiels à la même API, espacés de 700 ms. Les limites serveur existantes restent applicables à chaque page. L’onglet doit rester ouvert ; un bouton permet d’arrêter et conserve les résultats déjà reçus. Aucun rapport ni état de visite n’est stocké côté serveur.

Le moteur découvre au maximum 80 liens HTML admissibles par page : même origine finale (protocole et domaine), sans paramètres, sans formulaires, sans fichiers courants, sans liens nofollow/ugc/sponsored, ni espaces de connexion usuels. Chaque récupération conserve les vérifications DNS public, robots.txt, redirections, taille et délais existantes. Les pages avec une balise base ne développent pas de liens. Le sitemap n’est pas consulté. Une redirection vers un autre site après la page de départ est exclue du bilan et de la poursuite.

Le bilan indique les succès, tentatives, erreurs et liens en attente. Les priorités regroupent les actions/suggestions admissibles par contrôle et statut ; les décisions humaines restent séparées. Des titres/descriptions identiques sont signalés pour relecture, sans inventer de pénalité. Le détail de chaque page est sélectionnable. JSON, Markdown et consignes IA contiennent toutes les pages analysées ; le PDF contient la synthèse et la page sélectionnée. Les cases cochées concernent uniquement cette page.

Vérification : tests de découverte des liens et résolution relative, limites, exclusions, regroupement des constats et répétitions.


### Délais et résultats partiels (0.2.1)

Le client distingue un arrêt demandé d’une réponse absente après 45 secondes. Un compteur d’attente reste visible. Chaque page réussie est affichée immédiatement ; les échecs suivants ne suppriment pas les résultats. Le moteur partage un budget réseau de 25 secondes entre robots.txt et les redirections, chaque récupération gardant un maximum de 10 secondes. La résolution DNS du système reste soumise à ses propres délais. Le script PHP a une limite d’exécution de 35 secondes. Ces limites évitent d’empiler les attentes ; elles ne prouvent pas la cause d’une réponse absente chez l’hébergeur.


Les demandes du formulaire ne transmettent pas de cookies et ne sont pas mises en cache. Une réponse absente depuis le navigateur n’est pas attribuée au site cible sans preuve. Les échecs du test de production affichent uniquement le code HTTP, le type de réponse, le titre HTML et des marqueurs de protection connus, sans cookies ni corps HTML complet.

## Contrôle de déploiement sans POST

Le test de production échouait par intermittence en 503 : la réponse n’était pas celle du moteur mais une page « Test de sécurité / Security check » du pare-feu d’O2Switch (marqueurs `captcha` et `cloudflare`, type `text/html`), servie aux requêtes POST venant du runner GitHub. Les GET passaient. Un déploiement rouge décrivait donc la réputation de l’adresse du runner, pas l’état du site.

La vérification réseau réelle a été déplacée avant le déploiement, sur le runner : `php scripts/octet-audit.php https://lesingedunumerique.fr/` exécute le moteur du dépôt contre une page réelle, sans traverser le pare-feu. L’étape s’arrête si cURL ou DOM manquent sur le runner, et vérifie la présence des onze identifiants de contrôle plutôt que leur nombre : ajouter un contrôle ne casse plus le déploiement.

Après le déploiement, `scripts/check-boussole-production.py` n’envoie plus aucun POST. Il vérifie en GET les quatre pages, le refus JSON 405 de `audit.php`, puis `/boussole/health.php`. Ce nouveau point d’entrée charge `engine.php`, répond en JSON la version du moteur, la version majeure de PHP et la présence de cURL et DOM, et ne contacte jamais le réseau. La version de PHP est donnée en majeur.mineur, sans le correctif : elle suffit à repérer un changement fait dans le panneau de l’hébergeur sans désigner les vulnérabilités publiées pour une version précise. Elle est écrite dans le journal de chaque déploiement. Le contrôle compare cette version à la constante `VERSION` du dépôt : un déploiement partiel ou périmé est détecté.

L’étape est désormais `continue-on-error`, comme le healthcheck qui la précède, et une annotation d’avertissement signale son échec. Le déploiement a déjà eu lieu à ce stade ; un échec ne doit plus faire croire à une publication ratée. En contrepartie, un échec réel ne bloque plus rien : il faut lire les avertissements du run. Les six tentatives espacées de 20 secondes couvrent désormais l’ensemble des contrôles, pas seulement les pages.

`npm run test:boussole` exécute `php -l` sur les trois fichiers PHP publics avant les tests. PHP n’est pas installé sur le poste de développement : sans ce garde-fou, une erreur de syntaxe n’apparaîtrait qu’en production.

## Plusieurs analyses à la fois

Le moteur n'acceptait qu'une analyse réseau simultanée sur tout le site : un verrou unique, pris sans attente, renvoyait aussitôt 503 à la seconde personne. Deux visiteurs arrivant ensemble se refusaient mutuellement, et le mode exploration, qui enchaîne cinq appels, rendait la collision courante dès qu'une deuxième personne utilisait l'outil.

Trois créneaux remplacent ce verrou. La limite d'origine reste : le nombre de récupérations réseau menées de front est toujours borné, pour ne pas épuiser l'hébergement mutualisé. Quand les trois sont pris, la demande attend jusqu'à deux secondes qu'un créneau se libère au lieu de refuser immédiatement ; passé ce délai elle répond 503 avec `Retry-After`. Les constantes `AUDIT_SLOTS` et `AUDIT_WAIT_SECONDS` en tête de `audit.php` ajustent ces deux valeurs.

Le créneau est pris avant le décompte horaire. Une demande écartée pour cause de charge n'a donné lieu à aucune analyse : elle ne consomme plus l'une des dix analyses de la personne. L'ancien fichier `octet-audit-active.lock` n'est plus utilisé ; trois fichiers de taille nulle le remplacent, aux noms fixes, sans nettoyage nécessaire.

Vérification locale avec `PHP_CLI_SERVER_WORKERS` : cinq demandes simultanées réussissent toutes, dont deux après une attente inférieure à une seconde. En forçant un créneau unique et une attente de 0,2 seconde, la demande excédentaire reçoit bien le 503 et son message. Quatre contrôles supplémentaires verrouillent la forme du correctif, faute de pouvoir inclure le script de requête dans les tests.
