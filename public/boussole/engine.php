<?php
declare(strict_types=1);
namespace Octet;

const VERSION = '0.1.2';

function normalize_url(string $url): string {
    $url = trim($url);
    if (strlen($url) > 2048 || preg_match('/[\x00-\x20\\\\]/', $url)) throw new \RuntimeException('Adresse invalide.');
    if (!preg_match('~^https?://~i', $url)) $url = 'https://' . $url;
    $p = parse_url($url);
    if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || isset($p['user']) || isset($p['pass']) || isset($p['query'])) {
        throw new \RuntimeException('Utilisez une adresse HTTP(S), sans identifiants ni paramètres privés après « ? ».');
    }
    $host = strtolower($p['host'] ?? '');
    if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $host)) throw new \RuntimeException('Indiquez un nom de domaine public (les adresses IP et locales sont exclues).');
    if (isset($p['port']) && $p['port'] !== ($p['scheme'] === 'https' ? 443 : 80)) throw new \RuntimeException('Seuls les ports web standards sont acceptés.');
    return strtolower($p['scheme']) . '://' . $host . ($p['path'] ?? '/');
}

function public_ipv4(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    // Additional special-use ranges, including shared space and benchmarking.
    $n = ip2long($ip);
    foreach ([['100.64.0.0',10], ['192.0.0.0',24], ['192.0.2.0',24], ['198.18.0.0',15], ['198.51.100.0',24], ['203.0.113.0',24], ['224.0.0.0',4], ['240.0.0.0',4]] as [$base,$bits]) {
        $mask = -1 << (32-$bits);
        if (($n & $mask) === (ip2long($base) & $mask)) return false;
    }
    return true;
}

function resolve_location(string $base, string $location): string {
    if (preg_match('~^https?://~i', $location)) return normalize_url($location);
    $p = parse_url($base); $origin = $p['scheme'].'://'.$p['host'];
    if (str_starts_with($location, '//')) return normalize_url($p['scheme'].':'.$location);
    $path = str_starts_with($location, '/') ? $location : dirname($p['path'] ?? '/').'/'.$location;
    $segments = [];
    foreach (explode('/', $path) as $s) {
        if ($s === '..') array_pop($segments);
        elseif ($s !== '' && $s !== '.') $segments[] = $s;
    }
    return normalize_url($origin.'/'.implode('/', $segments));
}

function fetch_public(string $url): array {
    $url = normalize_url($url);
    $host = parse_url($url, PHP_URL_HOST);
    $ips = gethostbynamel($host);
    if (!$ips) throw new \RuntimeException('Ce domaine ne répond pas en IPv4.');
    foreach ($ips as $ip) if (!public_ipv4($ip)) throw new \RuntimeException('Cette destination réseau est exclue de l’audit.');
    $body = ''; $headers = []; $tooLarge = false;
    $ch = curl_init($url);
    $port = str_starts_with($url, 'https:') ? 443 : 80;
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_PROXY => '', CURLOPT_RESOLVE => ["$host:$port:{$ips[0]}"],
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'OctetAudit/0.1 (+https://lesingedunumerique.fr/outils/boussole/)',
        CURLOPT_ENCODING => '',
        CURLOPT_HEADERFUNCTION => static function ($ch, $line) use (&$headers) {
            if (str_starts_with($line, 'HTTP/')) $headers = [];
            if (str_contains($line, ':')) { [$k,$v] = explode(':', $line, 2); $headers[strtolower(trim($k))][] = trim($v); }
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => static function ($ch, $chunk) use (&$body, &$tooLarge) {
            if (strlen($body) + strlen($chunk) > 1500000) { $tooLarge = true; return 0; }
            $body .= $chunk; return strlen($chunk);
        },
    ]);
    $ok = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($tooLarge) throw new \RuntimeException('Cette page dépasse la limite de 1,5 Mo de HTML décompressé.');
    if ($ok === false) throw new \RuntimeException('Impossible de récupérer cette page (connexion, certificat ou délai dépassé).');
    return ['url'=>$url, 'status'=>$status, 'headers'=>$headers, 'html'=>$body];
}

// Conservative robots policy: any matching Disallow in * or OctetAudit groups
// stops this small public tool. Allow exceptions are intentionally not interpreted.
function robots_denies(string $text, string $path): bool {
    $agents = []; $inRules = false;
    foreach (preg_split('/\r?\n/', $text) as $line) {
        $line = trim(explode('#', $line, 2)[0]);
        if (!str_contains($line, ':')) continue;
        [$key,$value] = array_map('trim', explode(':', $line, 2));
        if (strtolower($key) === 'user-agent') {
            if ($inRules) { $agents = []; $inRules = false; }
            $agents[] = strtolower($value);
        } elseif (strtolower($key) === 'disallow') {
            $inRules = true;
            if ($value === '' || !array_intersect($agents, ['*','octetaudit'])) continue;
            $end = str_ends_with($value, '$');
            $pattern = str_replace('\\*', '.*', preg_quote($end ? substr($value,0,-1) : $value, '~'));
            if (preg_match('~^'.$pattern.($end ? '$' : '').'~', $path)) return true;
        } elseif ($agents) $inRules = true;
    }
    return false;
}

function audit_url(string $url, string $goal = 'association'): array {
    $url = normalize_url($url); $requested = $url;
    $robotsChecked = [];
    for ($i=0; $i<4; $i++) {
        $p = parse_url($url); $origin = $p['scheme'].'://'.$p['host'];
        if (!isset($robotsChecked[$origin])) {
            $robots = fetch_public($origin.'/robots.txt');
            if ($robots['status'] !== 404 && $robots['status'] !== 410 && $robots['status'] !== 200) throw new \RuntimeException('Le fichier robots.txt est inaccessible ou redirigé. Cet audit prudent ne poursuit pas l’analyse.');
            $robotsChecked[$origin] = $robots['status'] === 200 ? $robots['html'] : '';
        }
        if (robots_denies($robotsChecked[$origin], $p['path'] ?? '/')) throw new \RuntimeException('Une règle de robots.txt empêche cet audit. Par prudence, les exceptions Allow ne sont pas interprétées.');
        $page = fetch_public($url);
        if (in_array($page['status'], [301,302,303,307,308], true)) {
            $location = $page['headers']['location'][0] ?? '';
            if (!$location) throw new \RuntimeException('Redirection sans destination.');
            $next = resolve_location($url, $location);
            if (str_starts_with($url, 'https:') && str_starts_with($next, 'http:')) throw new \RuntimeException('Redirection HTTPS vers HTTP refusée.');
            $url = $next; continue;
        }
        if ($page['status'] !== 200) throw new \RuntimeException('La page répond avec le code HTTP '.$page['status'].'. Aucun audit HTML fiable n’est disponible.');
        $type = strtolower($page['headers']['content-type'][0] ?? '');
        if (!str_contains($type, 'text/html') && !str_contains($type, 'application/xhtml+xml')) throw new \RuntimeException('Cette adresse ne renvoie pas une page HTML.');
        return analyze_html($page['html'], $url, $goal, $page['headers']) + ['requestedUrl'=>$requested];
    }
    throw new \RuntimeException('Trop de redirections (maximum : 3).');
}

// Compare only explicit HTTP(S) addresses; never fetch the declared destination.
// At the domain root, an omitted slash and a default port identify the same URL.
function canonical_url_key(string $url): ?string {
    if (!filter_var($url, FILTER_VALIDATE_URL)) return null;
    $parts = parse_url($url);
    if (!$parts || !in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true)
        || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) return null;
    $scheme = strtolower($parts['scheme']);
    $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
    $suffix = $port === ($scheme === 'https' ? 443 : 80) ? '' : ':'.$port;
    return $scheme.'://'.strtolower($parts['host']).$suffix.($parts['path'] ?? '/')
        .(isset($parts['query']) ? '?'.$parts['query'] : '');
}

function canonical_finding(array $addresses, string $pageUrl, bool $unsupported = false): array {
    $why = 'Quand le même contenu existe à plusieurs adresses, ce réglage dit aux moteurs quelle adresse vous préférez afficher. L’outil ne vérifie pas le choix réellement fait par Google.';
    if (!$addresses) return ['suggestion', 'Aucune adresse préférée n’est déclarée dans la page',
        'Aucune indication trouvée dans le code de la page. Cela ne signifie pas que votre page est introuvable.', $why,
        'Ne changez rien pour ce point si vous n’avez pas de pages en double. Si le même contenu existe à plusieurs adresses, demandez à la personne qui gère le site d’indiquer l’adresse à conserver pour cette page.'];
    $evidence = 'Page analysée : '.$pageUrl.' · Adresse'.(count($addresses) > 1 ? 's indiquées : ' : ' indiquée : ').implode(' | ', $addresses);
    if (count($addresses) > 1) return ['review', 'Cette page indique plusieurs adresses préférées', $evidence, $why,
        'Transmettez les adresses ci-dessus à la personne qui gère le site avec ce message : « Cette page indique plusieurs adresses dans le réglage URL canonique. Pouvez-vous vérifier laquelle conserver et éviter les indications contradictoires ? »'];
    $key = canonical_url_key($addresses[0]);
    if ($key !== null && !$unsupported && $key === canonical_url_key($pageUrl)) return ['ok', 'L’adresse de cette page est bien indiquée',
        'Adresse indiquée aux moteurs : '.$addresses[0].' · Elle correspond à la page analysée.', $why,
        'Rien à modifier pour ce contrôle. Passez au point suivant.'];
    if ($key !== null && !$unsupported) return ['review', 'Cette page indique une autre adresse aux moteurs', $evidence, $why,
        'Comparez les deux adresses ci-dessus. Si l’autre adresse est bien la page que vous souhaitez privilégier, gardez ce réglage. Sinon, envoyez ce message à la personne qui gère le site : « Je souhaite que les moteurs privilégient '.$pageUrl.'. Pouvez-vous vérifier le réglage URL canonique de cette page ? »'];
    return ['review', 'L’adresse indiquée demande une vérification technique', $evidence, $why,
        'Ne modifiez pas le code au hasard. Transmettez ce rapport à la personne qui gère le site : « Pouvez-vous vérifier que le réglage URL canonique contient une adresse complète en https:// et qu’il est bien pris en compte pour cette page ? »'];
}

function analyze_html(string $html, string $url, string $goal = 'association', array $headers = []): array {
    $doc = new \DOMDocument();
    $previous = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors(); libxml_use_internal_errors($previous);
    $x = new \DOMXPath($doc);
    $clean = static fn($s) => trim(preg_replace('/\s+/u', ' ', $s) ?? '');
    $meta = static function(string $name) use ($x) {
        $values = [];
        foreach ($x->query('//meta') as $node) if (strtolower($node->getAttribute('name')) === $name) $values[] = $node->getAttribute('content');
        return implode(', ', $values);
    };
    $title = $clean($x->evaluate('string(//title)')); $description = $clean($meta('description'));
    $h1 = $x->query('//h1');
    $robots = $clean(strtolower($meta('robots').' '.$meta('googlebot').' '.implode(' ', $headers['x-robots-tag'] ?? [])));
    $canonical = []; $canonicalUnsupported = false;
    foreach ($x->query('//head/link[@href]') as $node) {
        if (!in_array('canonical', preg_split('/\s+/', strtolower($node->getAttribute('rel'))), true)) continue;
        $canonical[] = trim($node->getAttribute('href'));
        foreach (['hreflang', 'lang', 'media', 'type'] as $attribute) if ($node->hasAttribute($attribute)) $canonicalUnsupported = true;
    }
    $checks = [];
    $add = static function($id,$category,$status,$title,$evidence,$why,$action,$source,$minutes=5) use (&$checks,$url) {
        $checks[] = compact('id','category','status','title','evidence','why','action','source','minutes','url');
    };
    $google = 'https://developers.google.com/search/docs/';
    $add('SEO-TITLE','SEO', $title ? 'ok':'action', 'Le nom de votre page dans les recherches', $title ?: 'Aucun titre HTML trouvé.', 'Le titre est comme l’étiquette d’un livre : il aide à choisir la bonne page.', $title ? 'Lisez le titre affiché ci-dessus. Décrit-il clairement cette page ? Si oui, gardez-le. Sinon, modifiez le titre dans les réglages SEO de cette page ou transmettez un nouveau titre à la personne qui gère le site.' : 'Dans votre outil de publication, ouvrez cette page, puis ses réglages SEO. Renseignez un titre qui explique le sujet et le nom de votre activité. Si vous ne trouvez pas ce réglage, envoyez ce rapport à la personne qui gère le site.', $google.'appearance/title-link');
    $add('SEO-DESCRIPTION','SEO',$description ? 'ok':'suggestion','Présenter la page en quelques mots',$description ?: 'Aucune description trouvée.','La description peut aider le moteur à présenter la page ; il peut aussi choisir un autre extrait.',$description ? 'Relisez le résumé affiché ci-dessus. Explique-t-il ce que le visiteur trouvera sur cette page ? Si oui, gardez-le. Sinon, remplacez-le dans les réglages SEO de la page.' : 'Écrivez une ou deux phrases qui présentent cette page, puis ajoutez-les dans le champ Description ou Méta-description de ses réglages SEO. Vous pouvez aussi transmettre ce texte à la personne qui gère le site.',$google.'appearance/snippet');
    $add('SEO-NOINDEX','SEO',preg_match('/\b(noindex|none)\b/', $robots) ? 'review':'ok','Vérifier le choix d’apparaître dans les moteurs',$robots ?: 'Aucune directive noindex détectée dans le HTML ou les en-têtes.','Une directive noindex peut être volontaire : brouillon, page privée ou contenu à exclure. Son absence ne prouve pas que la page est indexée.',preg_match('/\b(noindex|none)\b/', $robots) ? 'Si cette page doit être trouvable sur les moteurs, demandez à la personne qui gère le site de vérifier l’option qui masque cette page aux moteurs de recherche. Si vous souhaitez volontairement la garder à l’écart des recherches, ne changez rien.' : 'Aucun blocage noindex n’a été repéré : rien à modifier pour ce contrôle. Cela ne prouve pas que Google connaît déjà cette page.',$google.'crawling-indexing/robots-meta-tag');
    [$canonicalStatus, $canonicalTitle, $canonicalEvidence, $canonicalWhy, $canonicalAction] = canonical_finding($canonical, $url, $canonicalUnsupported);
    $add('SEO-CANONICAL','SEO',$canonicalStatus,$canonicalTitle,$canonicalEvidence,$canonicalWhy,$canonicalAction,$google.'crawling-indexing/consolidate-duplicate-urls',10);
    if (!$canonical) $checks[array_key_last($checks)]['planEligible'] = false;
    $add('CONTENT-HEADINGS','Clarté',$h1->length > 0 ? 'review':'suggestion','Rendre le sujet visible',$h1->length.' titre(s) principal(aux) H1 trouvé(s).','Les titres organisent la lecture comme les panneaux d’un parcours. Leur présence seule ne prouve pas leur pertinence.','Lisez le grand titre au début de votre page. Comprend-on immédiatement son sujet ? Si oui, gardez-le. Sinon, réécrivez-le dans votre éditeur de page. Si aucun grand titre n’est trouvé, ajoutez-en un avec le style Titre 1 de votre éditeur ou demandez à la personne qui gère le site de le faire.',$google.'fundamentals/seo-starter-guide',10);
    $missingAlt = 0; $images = $x->query('//img');
    foreach ($images as $img) if (!$img->hasAttribute('alt')) $missingAlt++;
    $add('CONTENT-IMAGES','Clarté',$missingAlt ? 'action':'ok','Expliquer les images utiles',"$missingAlt image(s) sans attribut alt sur {$images->length}.",'Une alternative textuelle donne accès à l’information quand une image ne peut pas être vue.',$images->length === 0 ? 'Aucune image n’a été trouvée dans la version de la page analysée : rien à modifier pour ce point.' : ($missingAlt ? 'Dans votre outil de publication, ouvrez les images de cette page et cherchez le champ Texte alternatif. Pour chaque image qui apporte une information, décrivez brièvement ce qu’elle montre. Laissez ce texte vide pour une image purement décorative. Si ce champ manque, transmettez ce rapport à la personne qui gère le site.' : 'Les images possèdent le champ de description attendu. Relisez les descriptions des images utiles : expliquent-elles bien leur contenu ? Si oui, gardez-les. Une description vide peut être volontaire pour une image décorative.'),'https://www.w3.org/WAI/tutorials/images/',15);
    $lang = $clean($x->evaluate('string(//html/@lang)'));
    $add('CONTENT-LANG','Clarté',$lang ? 'ok':'action','Indiquer la langue du document',$lang ?: 'Attribut lang absent ou vide.','Les outils de lecture vocale ont besoin de connaître la langue pour bien prononcer le texte.',$lang ? 'Une langue est déclarée. Le code fr signifie français et en signifie anglais. Si la langue déclarée correspond à celle de votre texte, ne changez rien. Sinon, demandez à la personne qui gère le site de corriger la langue de cette page.' : 'Dans les réglages de votre site, vérifiez la langue du contenu. Si votre page est en français, demandez à la personne qui gère le site d’ajouter lang="fr" dans le modèle de page. Vous pouvez lui transmettre ce rapport.','https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html');
    $viewport = $meta('viewport');
    $add('TECH-MOBILE','Technique',str_contains(strtolower($viewport),'width=device-width') ? 'ok':'review','Préparer l’affichage sur téléphone',$viewport ?: 'Aucune balise viewport trouvée.','Cette indication aide à adapter la largeur de la page ; elle ne prouve pas que le site est confortable sur mobile.','Ouvrez la page sur un téléphone : vérifiez texte, menus et boutons. Faites vérifier le viewport si nécessaire.',$google.'crawling-indexing/mobile/mobile-sites-mobile-first-indexing',10);
    $ldCount = 0; $ldInvalid = 0;
    foreach ($x->query('//script[@type="application/ld+json"]') as $script) {
        $ldCount++; json_decode($script->textContent); if (json_last_error() !== JSON_ERROR_NONE) $ldInvalid++;
    }
    $add('GEO-STRUCTURE','GEO',$ldInvalid ? 'action':'review','Les informations supplémentaires pour les moteurs',($ldInvalid ? "$ldInvalid bloc(s) d’informations ne peuvent pas être lus correctement." : ($ldCount ? "$ldCount bloc(s) d’informations ont été trouvés pour les moteurs. Leur exactitude reste à vérifier." : 'Aucun bloc de ce type n’a été trouvé dans le code analysé. Ce n’est pas automatiquement une erreur.')),'Ces informations peuvent décrire une organisation ou un article aux moteurs. Seul le format JSON-LD est vérifié ici ; les autres formats et le contenu ajouté par JavaScript ne le sont pas. Cela ne prouve pas qu’une IA citera votre site.',($ldInvalid ? 'Transmettez ce rapport à la personne qui gère le site avec ce message : « Un bloc d’informations pour les moteurs ne peut pas être lu. Pouvez-vous corriger la syntaxe de ce bloc JSON-LD ? »' : ($ldCount ? 'Faites vérifier que les informations déclarées, par exemple le nom de l’organisation, l’auteur ou la date selon le contenu, correspondent bien à ce qui est affiché sur la page. Si c’est le cas, gardez-les.' : 'Ce point n’est pas une erreur à corriger automatiquement. Occupez-vous d’abord des informations visibles de la page. Si vous êtes accompagné, demandez si une description technique de votre organisation ou de vos articles serait utile.')),$google.'appearance/structured-data/intro-structured-data',15);
    $goals = [
        'association'=>'Une personne comprend-elle votre mission, votre territoire et comment participer ?',
        'activite'=>'Une personne comprend-elle votre offre, la zone desservie et comment vous contacter ?',
        'publication'=>'Le lecteur identifie-t-il les auteurs, les sources et les dates utiles ?',
    ];
    $goal = isset($goals[$goal]) ? $goal : 'association';
    $add('GEO-USEFULNESS','GEO','review','Un visiteur comprend-il ce que vous proposez ?',$goals[$goal],'Les informations fiables, explicites et utiles aux lecteurs forment le socle d’un contenu exploitable. Un automate ne peut pas certifier votre expertise.','Demandez à une personne qui ne connaît pas votre site de lire cette page, puis posez-lui la question affichée ci-dessus. Si elle ne trouve pas la réponse, ajoutez les informations manquantes sur la page. Si elle comprend, gardez votre contenu.',$google.'fundamentals/creating-helpful-content',20);
    $add('GEO-CITATIONS','GEO','unmeasured','Votre site apparaît-il dans les réponses des IA ?','Aucun service IA interrogé. Aucune donnée de citation connectée.','Une analyse HTML ne mesure pas votre présence dans les réponses des assistants.','Ce rapport ne permet pas de répondre. Pour un premier essai, posez à votre assistant une question qu’un visiteur pourrait poser sur votre activité, puis regardez s’il cite votre site. Un seul essai ne suffit pas à mesurer votre visibilité : les réponses peuvent varier.',$google.'appearance/ai-features',30);
    return ['schemaVersion'=>'1.0','engineVersion'=>VERSION,'generatedAt'=>gmdate('c'),'url'=>$url,'goal'=>$goal,'scope'=>'Une page HTML reçue par le serveur, sans exécution JavaScript.','limitations'=>[
        'Pas d’exploration du site, de contrôle des liens cassés ou d’analyse des autres pages.',
        'Indexation réelle, positions, popularité, vitesse vécue et citations IA non mesurées.',
        'Aucune note de classement ; les constats positifs attestent uniquement du contrôle indiqué.',
        'Respect prudent de robots.txt : les exceptions Allow ne sont pas interprétées.',
    ],'checks'=>$checks];
}
