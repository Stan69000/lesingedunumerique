<?php
declare(strict_types=1);
namespace Octet;

const VERSION = '0.1.0';

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
    $robots = strtolower($meta('robots').' '.$meta('googlebot').' '.implode(' ', $headers['x-robots-tag'] ?? []));
    $canonical = [];
    foreach ($x->query('//link[@href]') as $node) if (in_array('canonical', preg_split('/\s+/', strtolower($node->getAttribute('rel'))), true)) $canonical[] = $node->getAttribute('href');
    $checks = [];
    $add = static function($id,$category,$status,$title,$evidence,$why,$action,$source,$minutes=5) use (&$checks,$url) {
        $checks[] = compact('id','category','status','title','evidence','why','action','source','minutes','url');
    };
    $google = 'https://developers.google.com/search/docs/';
    $add('SEO-TITLE','SEO', $title ? 'ok':'action', 'Donner un nom clair à la page', $title ?: 'Aucun titre HTML trouvé.', 'Le titre est comme l’étiquette d’un livre : il aide à choisir la bonne page.', 'Dans les réglages SEO de votre page, écrivez un titre précis et fidèle au contenu. Aucun nombre de caractères ne garantit un bon classement.', $google.'appearance/title-link');
    $add('SEO-DESCRIPTION','SEO',$description ? 'ok':'suggestion','Présenter la page en quelques mots',$description ?: 'Aucune description trouvée.','La description peut aider le moteur à présenter la page ; il peut aussi choisir un autre extrait.','Ajoutez un résumé utile et spécifique dans les réglages SEO de cette page. Ce champ ne garantit pas un meilleur classement.',$google.'appearance/snippet');
    $add('SEO-NOINDEX','SEO',preg_match('/\b(noindex|none)\b/', $robots) ? 'review':'ok','Vérifier le choix d’apparaître dans les moteurs',$robots ?: 'Aucune directive noindex détectée dans le HTML ou les en-têtes.','Une directive noindex peut être volontaire : brouillon, page privée ou contenu à exclure. Son absence ne prouve pas que la page est indexée.','Si cette page doit être publique dans les moteurs, faites vérifier les réglages d’indexation. Confirmez ce choix avant toute suppression de directive.',$google.'crawling-indexing/robots-meta-tag');
    $add('SEO-CANONICAL','SEO',count($canonical) === 1 ? 'review':'suggestion','Identifier l’adresse de référence', $canonical ? implode(' | ', $canonical) : 'Aucune adresse canonique HTML trouvée (en-tête Link non analysé).','Quand plusieurs adresses présentent le même contenu, une adresse de référence aide à les regrouper. Son absence n’est pas toujours un problème.','Vérifiez que l’adresse de référence correspond à la version souhaitée et accessible. Le moteur conserve le choix final.',$google.'crawling-indexing/consolidate-duplicate-urls',10);
    $add('CONTENT-HEADINGS','Clarté',$h1->length > 0 ? 'review':'suggestion','Rendre le sujet visible',$h1->length.' titre(s) principal(aux) H1 trouvé(s).','Les titres organisent la lecture comme les panneaux d’un parcours. Leur présence seule ne prouve pas leur pertinence.','Relisez les titres : décrivent-ils le sujet et les sections ? Plusieurs H1 ne constituent pas automatiquement une pénalité SEO.',$google.'fundamentals/seo-starter-guide',10);
    $missingAlt = 0; $images = $x->query('//img');
    foreach ($images as $img) if (!$img->hasAttribute('alt')) $missingAlt++;
    $add('CONTENT-IMAGES','Clarté',$missingAlt ? 'action':'ok','Expliquer les images utiles',"$missingAlt image(s) sans attribut alt sur {$images->length}.",'Une alternative textuelle donne accès à l’information quand une image ne peut pas être vue.','Décrivez l’information des images utiles. Pour une image décorative, utilisez alt="". Le sens des alternatives reste à vérifier par une personne.','https://www.w3.org/WAI/tutorials/images/',15);
    $lang = $clean($x->evaluate('string(//html/@lang)'));
    $add('CONTENT-LANG','Clarté',$lang ? 'ok':'action','Indiquer la langue du document',$lang ?: 'Attribut lang absent ou vide.','Les outils de lecture vocale ont besoin de connaître la langue pour bien prononcer le texte.','Renseignez la langue réelle dans le modèle de page, par exemple lang="fr". Ce contrôle d’accessibilité ne constitue pas un audit RGAA.','https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html');
    $viewport = $meta('viewport');
    $add('TECH-MOBILE','Technique',str_contains(strtolower($viewport),'width=device-width') ? 'ok':'review','Préparer l’affichage sur téléphone',$viewport ?: 'Aucune balise viewport trouvée.','Cette indication aide à adapter la largeur de la page ; elle ne prouve pas que le site est confortable sur mobile.','Ouvrez la page sur un téléphone : vérifiez texte, menus et boutons. Faites vérifier le viewport si nécessaire.',$google.'crawling-indexing/mobile/mobile-sites-mobile-first-indexing',10);
    $ldCount = 0; $ldInvalid = 0;
    foreach ($x->query('//script[@type="application/ld+json"]') as $script) {
        $ldCount++; json_decode($script->textContent); if (json_last_error() !== JSON_ERROR_NONE) $ldInvalid++;
    }
    $add('GEO-STRUCTURE','GEO',$ldInvalid ? 'action':'review','Vérifier les informations structurées',"$ldCount bloc(s) JSON-LD ; $ldInvalid syntaxe(s) JSON invalide(s).",'Ces blocs peuvent décrire une organisation ou un article. Leur présence ne garantit ni résultat enrichi ni citation IA.','Si des données structurées sont pertinentes, vérifiez leur exactitude et leur conformité avec le contenu visible. Aucun schéma spécial IA n’est requis.',$google.'appearance/structured-data/intro-structured-data',15);
    $goals = [
        'association'=>'Une personne comprend-elle votre mission, votre territoire et comment participer ?',
        'activite'=>'Une personne comprend-elle votre offre, la zone desservie et comment vous contacter ?',
        'publication'=>'Le lecteur identifie-t-il les auteurs, les sources et les dates utiles ?',
    ];
    $goal = isset($goals[$goal]) ? $goal : 'association';
    $add('GEO-USEFULNESS','GEO','review','Répondre au besoin réel du visiteur',$goals[$goal],'Les informations fiables, explicites et utiles aux lecteurs forment le socle d’un contenu exploitable. Un automate ne peut pas certifier votre expertise.','Faites relire la page par une personne extérieure : peut-elle répondre à cette question sans vous solliciter ? Corrigez les informations manquantes et citez vos sources.',$google.'fundamentals/creating-helpful-content',20);
    $add('GEO-CITATIONS','GEO','unmeasured','Mesurer les citations dans les réponses IA','Aucun service IA interrogé. Aucune donnée de citation connectée.','Une analyse HTML ne mesure pas votre présence dans les réponses des assistants.','Pour mesurer la visibilité, définissez des questions, des services et des dates de test. Conservez les réponses et les liens cités.',$google.'appearance/ai-features',30);
    return ['schemaVersion'=>'1.0','engineVersion'=>VERSION,'generatedAt'=>gmdate('c'),'url'=>$url,'goal'=>$goal,'scope'=>'Une page HTML reçue par le serveur, sans exécution JavaScript.','limitations'=>[
        'Pas d’exploration du site, de contrôle des liens cassés ou d’analyse des autres pages.',
        'Indexation réelle, positions, popularité, vitesse vécue et citations IA non mesurées.',
        'Aucune note de classement ; les constats positifs attestent uniquement du contrôle indiqué.',
        'Respect prudent de robots.txt : les exceptions Allow ne sont pas interprétées.',
    ],'checks'=>$checks];
}
