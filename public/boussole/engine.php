<?php
declare(strict_types=1);
namespace Octet;

const VERSION = '0.6.0';

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
    $basePath = $p['path'] ?? '/';
    $directory = str_ends_with($basePath, '/') ? $basePath : dirname($basePath).'/';
    $path = str_starts_with($location, '/') ? $location : $directory.$location;
    $segments = [];
    foreach (explode('/', $path) as $s) {
        if ($s === '..') array_pop($segments);
        elseif ($s !== '' && $s !== '.') $segments[] = $s;
    }
    return normalize_url($origin.'/'.implode('/', $segments).($segments && str_ends_with($path, '/') ? '/' : ''));
}

function fetch_public(string $url, ?float $deadline = null): array {
    if ($deadline !== null && microtime(true) >= $deadline) throw new \RuntimeException('Le délai de récupération de cette page est dépassé. Cette page n’a pas été analysée.');
    $url = normalize_url($url);
    $host = parse_url($url, PHP_URL_HOST);
    $ips = gethostbynamel($host);
    if (!$ips) throw new \RuntimeException('Ce domaine ne répond pas en IPv4.');
    foreach ($ips as $ip) if (!public_ipv4($ip)) throw new \RuntimeException('Cette destination réseau est exclue de l’audit.');
    $remaining = $deadline === null ? 10 : min(10, (int)ceil($deadline - microtime(true)));
    if ($remaining <= 0) throw new \RuntimeException('Le délai de récupération de cette page est dépassé. Cette page n’a pas été analysée.');
    $body = ''; $headers = []; $tooLarge = false;
    $ch = curl_init($url);
    $port = str_starts_with($url, 'https:') ? 443 : 80;
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_PROXY => '', CURLOPT_RESOLVE => ["$host:$port:{$ips[0]}"],
        CURLOPT_CONNECTTIMEOUT => min(4, $remaining), CURLOPT_TIMEOUT => $remaining, CURLOPT_SSL_VERIFYPEER => true,
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
// stops this small public tool. Allow exceptions are intentionally not
// interpreted. Returns which agents the rule names, so a page closed to every
// crawler can be told apart from one that excludes this tool alone.
function robots_groups(string $text): array {
    $groups = []; $agents = []; $inRules = false;
    foreach (preg_split('/\r?\n/', $text) as $line) {
        $line = trim(explode('#', $line, 2)[0]);
        if (!str_contains($line, ':')) continue;
        [$key,$value] = array_map('trim', explode(':', $line, 2));
        $key = strtolower($key);
        if ($key === 'user-agent') {
            if ($inRules) { $agents = []; $inRules = false; }
            $agents[] = strtolower($value);
        } elseif ($key === 'disallow') {
            $inRules = true;
            if ($value === '') continue;
            foreach ($agents as $agent) $groups[$agent][] = $value;
        } elseif ($agents) $inRules = true;
    }
    return $groups;
}

/** First Disallow of this group that covers the path, or null. Allow is not read. */
function robots_path_blocked(array $disallows, string $path): ?string {
    foreach ($disallows as $value) {
        $end = str_ends_with($value, '$');
        $pattern = str_replace('\\*', '.*', preg_quote($end ? substr($value,0,-1) : $value, '~'));
        if (preg_match('~^'.$pattern.($end ? '$' : '').'~', $path)) return $value;
    }
    return null;
}

/** A named group wins over the catch-all, as the robots.txt convention requires. */
function robots_agent_blocked(array $groups, string $agent, string $path): ?string {
    $agent = strtolower($agent);
    $rules = $groups[$agent] ?? $groups['*'] ?? null;
    return $rules === null ? null : robots_path_blocked($rules, $path);
}

function robots_rule(string $text, string $path): ?array {
    $groups = robots_groups($text);
    foreach (['*', 'octetaudit'] as $agent) {
        $hit = isset($groups[$agent]) ? robots_path_blocked($groups[$agent], $path) : null;
        if ($hit !== null) {
            $named = array_values(array_filter(['*','octetaudit'], static fn($a) => ($groups[$a] ?? null) !== null && robots_path_blocked($groups[$a], $path) !== null));
            return ['agents'=>$named, 'disallow'=>$hit];
        }
    }
    return null;
}

// Documented crawlers of the assistants people actually use. Blocking them is a
// legitimate editorial choice, so this is reported, never scored as a fault.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];

/** Which assistant crawlers robots.txt turns away from this page. */
function ai_crawler_access(string $robotsText, string $path): array {
    $groups = robots_groups($robotsText);
    $allowed = []; $blocked = [];
    foreach (AI_CRAWLERS as $agent) {
        $hit = robots_agent_blocked($groups, $agent, $path);
        if ($hit === null) { $allowed[] = $agent; continue; }
        $blocked[$agent] = isset($groups[strtolower($agent)]) ? 'règle propre à ce robot' : 'règle générale';
    }
    return ['allowed'=>$allowed, 'blocked'=>$blocked];
}
function robots_denies(string $text, string $path): bool { return robots_rule($text, $path) !== null; }

/** The four states robots.txt can leave a page in, in one wording each.
 *  $context carries 'rule' when blocked, 'status' when unreadable, and
 *  'hasFile' to tell a permissive file from an absent one. */
function robots_finding(string $state, string $origin, string $url, array $context = []): array {
    $source = 'https://developers.google.com/search/docs/crawling-indexing/robots/intro';
    $base = ['id'=>'SEO-ROBOTS', 'category'=>'SEO', 'source'=>$source, 'url'=>$url];
    $why = 'Le fichier robots.txt, placé à la racine du site, indique aux robots ce qu’ils ont le droit d’explorer. Une règle qui couvre cette page empêche les moteurs de la lire : elle a donc peu de chances d’apparaître dans les résultats de recherche. C’est l’oubli le plus fréquent après la mise en ligne d’un site.';

    if ($state === 'unknown') return $base + ['status'=>'unmeasured', 'minutes'=>5,
        'title'=>'Les robots ont-ils le droit d’explorer cette page ?',
        'evidence'=>'Le fichier robots.txt du site n’a pas été consulté pour cet exemple.',
        'why'=>$why,
        'action'=>'Lancez une analyse sur une adresse en ligne pour obtenir ce constat.'];

    if ($state === 'unreadable') return $base + ['status'=>'review', 'minutes'=>5,
        'title'=>'Le fichier robots.txt n’a pas pu être lu',
        'evidence'=>'Réponse HTTP '.($context['status'] ?? 0).' pour '.$origin.'/robots.txt',
        'why'=>'Ce fichier indique aux robots ce qu’ils ont le droit d’explorer. Faute d’avoir pu le lire, nous ignorons si l’exploration est autorisée : par prudence, la page n’a pas été récupérée. Cela ne prouve pas que les moteurs rencontrent la même difficulté.',
        'action'=>'Ouvrez '.$origin.'/robots.txt dans votre navigateur. Si le fichier ne s’affiche pas comme du texte simple, demandez à la personne qui gère le site de vérifier qu’il est bien servi à cette adresse, puis relancez l’analyse.'];

    if ($state === 'allowed') return $base + ['status'=>'ok', 'minutes'=>5,
        'title'=>'Les moteurs ont le droit d’explorer cette page',
        'evidence'=>($context['hasFile'] ?? true)
            ? 'Fichier robots.txt lu sur '.$origin.'. Aucune de ses règles ne couvre cette page.'
            : 'Aucun fichier robots.txt n’a été trouvé sur '.$origin.'. Sans ce fichier, les robots explorent librement le site.',
        'why'=>'Le fichier robots.txt indique aux robots ce qu’ils ont le droit d’explorer. Rien n’empêche ici l’exploration de cette page. Cela ne prouve pas que Google la connaisse déjà ni qu’il l’affiche dans ses résultats.',
        'action'=>'Rien à modifier pour ce contrôle. Si vous souhaitiez au contraire tenir cette page à l’écart des moteurs, c’est le réglage noindex, examiné plus haut, qui s’en charge — robots.txt ne suffit pas.'];

    $rule = $context['rule'] ?? ['agents'=>[], 'disallow'=>''];
    $line = 'Disallow: '.$rule['disallow'];
    if (!in_array('*', $rule['agents'], true)) return $base + ['status'=>'review', 'minutes'=>5,
        'title'=>'Votre site refuse l’exploration par notre outil',
        'evidence'=>$origin.'/robots.txt · User-agent: OctetAudit · '.$line,
        'why'=>'Cette règle ne vise que le robot du Singe. Les moteurs de recherche ne sont pas concernés : votre référencement n’est pas en cause ici.',
        'action'=>'Il n’y a rien à corriger pour les moteurs. Pour obtenir ce bilan, demandez à la personne qui gère le site d’autoriser le robot nommé OctetAudit dans le fichier robots.txt, puis relancez l’analyse.'];
    return $base + ['status'=>'action', 'minutes'=>10,
        'title'=>'Votre site demande aux robots de ne pas explorer cette page',
        'evidence'=>$origin.'/robots.txt · User-agent: * · '.$line.' · Cette règle vise tous les robots, ceux de Google compris.',
        'why'=>$why,
        'action'=>'Ouvrez '.$origin.'/robots.txt et retrouvez la ligne indiquée ci-dessus. Si vous souhaitez que cette page soit trouvable, demandez à la personne qui gère le site de retirer cette règle ou d’en réduire la portée. Ce blocage est parfois volontaire pendant la construction d’un site : dans ce cas, ne changez rien tant qu’il n’est pas prêt.'];
}

/** The page was never fetched, so the report carries that one finding alone. */
function robots_report(array $finding, string $url, string $requested, string $goal): array {
    return ['schemaVersion'=>'1.0', 'engineVersion'=>VERSION, 'generatedAt'=>gmdate('c'), 'url'=>$url, 'goal'=>$goal,
        'scope'=>'Le fichier robots.txt du site a été lu. La page elle-même n’a pas été récupérée.',
        'limitations'=>[
            'Aucun contrôle du titre, du contenu ou des réglages de la page : elle n’a pas été téléchargée.',
            'Respect prudent de robots.txt : les exceptions Allow ne sont pas interprétées.',
            'Ce constat décrit une règle écrite dans votre fichier, pas le comportement réel des moteurs.',
        ],
        'checks'=>[$finding], 'requestedUrl'=>$requested, 'discoveredLinks'=>[]];
}

/** Public HTML links only: no forms, query strings, assets or other origins. */
function discover_links(string $html, string $base): array {
    $doc = new \DOMDocument();
    $previous = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors(); libxml_use_internal_errors($previous);
    $origin = parse_url($base, PHP_URL_SCHEME).'://'.parse_url($base, PHP_URL_HOST);
    // A base element changes relative links; avoid guessing its effect.
    if ($doc->getElementsByTagName('base')->length) return [];
    $links = [];
    foreach ($doc->getElementsByTagName('a') as $a) {
        $href = trim($a->getAttribute('href'));
        if ($href === '' || str_starts_with($href, '#') || str_contains($href, '?') || $a->hasAttribute('download')) continue;
        if (preg_match('/\b(nofollow|ugc|sponsored)\b/i', $a->getAttribute('rel'))) continue;
        if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $href) && !preg_match('~^https?://~i', $href)) continue;
        $href = explode('#', $href, 2)[0];
        try { $url = resolve_location($base, $href); } catch (\RuntimeException $e) { continue; }
        if (parse_url($url, PHP_URL_SCHEME).'://'.parse_url($url, PHP_URL_HOST) !== $origin) continue;
        $path = parse_url($url, PHP_URL_PATH) ?: '/';
        if (preg_match('~/(?:wp-admin|wp-login\.php|admin|login|logout|signout|deconnexion|connexion|panier|cart|checkout|account|mon-compte)(?:/|$)~i', $path)) continue;
        if (preg_match('~\.(?:pdf|jpe?g|png|gif|svg|webp|avif|zip|mp[34]|xml|json|css|js|csv|docx?|xlsx?|ics|exe)$~i', $path)) continue;
        $links[$url] = true;
        if (count($links) >= 80) break;
    }
    return array_keys($links);
}

function audit_url(string $url, string $goal = 'association'): array {
    $url = normalize_url($url); $requested = $url;
    $deadline = microtime(true) + 25;
    $robotsChecked = [];
    for ($i=0; $i<4; $i++) {
        $p = parse_url($url); $origin = $p['scheme'].'://'.$p['host'];
        if (!isset($robotsChecked[$origin])) {
            $robots = fetch_public($origin.'/robots.txt', $deadline);
            // Still never fetched without permission; the refusal is now explained.
            if ($robots['status'] !== 404 && $robots['status'] !== 410 && $robots['status'] !== 200) {
                return robots_report(robots_finding('unreadable', $origin, $url, ['status'=>$robots['status']]), $url, $requested, $goal);
            }
            $robotsChecked[$origin] = $robots['status'] === 200 ? $robots['html'] : '';
        }
        $rule = robots_rule($robotsChecked[$origin], $p['path'] ?? '/');
        if ($rule) return robots_report(robots_finding('blocked', $origin, $url, ['rule'=>$rule]), $url, $requested, $goal);
        $page = fetch_public($url, $deadline);
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
        return analyze_html($page['html'], $url, $goal, $page['headers'], $robotsChecked[$origin]) + ['requestedUrl'=>$requested, 'discoveredLinks'=>discover_links($page['html'], $url)];
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

function analyze_html(string $html, string $url, string $goal = 'association', array $headers = [], ?string $robotsText = null): array {
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
    $origin = parse_url($url, PHP_URL_SCHEME).'://'.parse_url($url, PHP_URL_HOST);
    // audit_url only reaches here when the page was allowed, but the rule is
    // evaluated rather than assumed: analyze_html is also called on its own.
    $robotsRule = $robotsText === null ? null : robots_rule($robotsText, parse_url($url, PHP_URL_PATH) ?: '/');
    $checks[] = $robotsText === null
        ? robots_finding('unknown', $origin, $url)
        : ($robotsRule
            ? robots_finding('blocked', $origin, $url, ['rule'=>$robotsRule])
            : robots_finding('allowed', $origin, $url, ['hasFile'=>trim($robotsText) !== '']));
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
    // Open Graph decides how a shared link looks. Only og:image has no fallback:
    // without it the post is a bare line of text, so that drives the status.
    // Some publishing tools emit name= instead of property=; both are read.
    $og = static function(string $property) use ($x) {
        foreach ($x->query('//meta') as $node) {
            $key = strtolower($node->getAttribute('property') ?: $node->getAttribute('name'));
            if ($key !== $property) continue;
            $value = trim($node->getAttribute('content'));
            if ($value !== '') return $value;
        }
        return '';
    };
    $ogImage = $og('og:image');
    $alsoDeclared = array_keys(array_filter(['og:title' => $og('og:title'), 'og:description' => $og('og:description')]));
    $fallback = $alsoDeclared
        ? 'Également déclaré : '.implode(' et ', $alsoDeclared).'.'
        : 'Ni og:title ni og:description : les réseaux reprendront le titre et le résumé de la page, ce qui convient souvent.';
    $ogWhy = 'Les réseaux sociaux et les messageries ne lisent pas votre page : ils affichent un aperçu construit à partir de quelques indications placées dans son code. Sans image déclarée, votre lien apparaît comme une simple ligne de texte, bien moins remarquée. L’outil ne télécharge pas l’image : ni son poids ni ses dimensions ne sont vérifiés.';
    $ogSource = 'https://ogp.me/';
    if ($ogImage === '') {
        $add('SOCIAL-PREVIEW','Partage','action','L’image qui s’affiche quand on partage cette page',
            'Aucune image de partage (og:image) n’est déclarée. '.$fallback, $ogWhy,
            'Choisissez une image qui représente cette page — votre logo, une photo d’activité — et faites-la déclarer comme image de partage. Dans la plupart des outils de publication, ce réglage s’appelle « image à la une », « image de partage » ou « Open Graph ». Un format d’environ 1200 par 630 pixels convient à la majorité des réseaux.',
            $ogSource, 10);
    } elseif (!preg_match('~^https?://~i', $ogImage)) {
        $add('SOCIAL-PREVIEW','Partage','action','L’image qui s’affiche quand on partage cette page',
            'Image de partage déclarée : '.$ogImage.' · Cette adresse n’est pas complète. '.$fallback, $ogWhy,
            'Les réseaux ont besoin d’une adresse complète, commençant par https:// et contenant votre nom de domaine. Transmettez ce message à la personne qui gère le site : « L’image de partage de cette page est déclarée avec une adresse relative ; pouvez-vous la remplacer par une adresse absolue ? »',
            $ogSource, 10);
    } elseif (preg_match('~\.svg$~i', (string) parse_url($ogImage, PHP_URL_PATH))) {
        // Judged by extension only; the file itself is never downloaded.
        $add('SOCIAL-PREVIEW','Partage','review','L’image qui s’affiche quand on partage cette page',
            'Image de partage déclarée : '.$ogImage.' · Ce fichier est au format SVG. '.$fallback, $ogWhy,
            'Les principaux réseaux et messageries n’affichent pas les images SVG : votre lien risque de paraître sans vignette. Faites remplacer cette image par un fichier PNG ou JPEG, d’environ 1200 par 630 pixels. Vérifiez ensuite en collant le lien dans une conversation. Ce constat se fonde sur l’extension du fichier, qui n’a pas été téléchargé.',
            $ogSource, 10);
    } else {
        $add('SOCIAL-PREVIEW','Partage','ok','L’image qui s’affiche quand on partage cette page',
            'Image de partage déclarée : '.$ogImage.' · '.$fallback, $ogWhy,
            'Collez l’adresse de cette page dans une conversation ou un message privé et regardez l’aperçu obtenu. S’il vous convient, ne changez rien. L’image n’ayant pas été téléchargée, son poids et ses dimensions restent à vérifier.',
            $ogSource, 5);
    }
    $ldCount = 0; $ldInvalid = 0;
    foreach ($x->query('//script[@type="application/ld+json"]') as $script) {
        $ldCount++; json_decode($script->textContent); if (json_last_error() !== JSON_ERROR_NONE) $ldInvalid++;
    }
    $add('GEO-STRUCTURE','GEO',$ldInvalid ? 'action':'review','Les informations supplémentaires pour les moteurs',($ldInvalid ? "$ldInvalid bloc(s) d’informations ne peuvent pas être lus correctement." : ($ldCount ? "$ldCount bloc(s) d’informations ont été trouvés pour les moteurs. Leur exactitude reste à vérifier." : 'Aucun bloc de ce type n’a été trouvé dans le code analysé. Ce n’est pas automatiquement une erreur.')),'Ces informations peuvent décrire une organisation ou un article aux moteurs. Seul le format JSON-LD est vérifié ici ; les autres formats et le contenu ajouté par JavaScript ne le sont pas. Cela ne prouve pas qu’une IA citera votre site.',($ldInvalid ? 'Transmettez ce rapport à la personne qui gère le site avec ce message : « Un bloc d’informations pour les moteurs ne peut pas être lu. Pouvez-vous corriger la syntaxe de ce bloc JSON-LD ? »' : ($ldCount ? 'Faites vérifier que les informations déclarées, par exemple le nom de l’organisation, l’auteur ou la date selon le contenu, correspondent bien à ce qui est affiché sur la page. Si c’est le cas, gardez-les.' : 'Ce point n’est pas une erreur à corriger automatiquement. Occupez-vous d’abord des informations visibles de la page. Si vous êtes accompagné, demandez si une description technique de votre organisation ou de vos articles serait utile.')),$google.'appearance/structured-data/intro-structured-data',15);
    // The one thing about assistants that a static read can actually establish.
    $aiSource = $google.'crawling-indexing/overview-google-crawlers';
    if ($robotsText === null) {
        $add('GEO-AI-CRAWLERS','GEO','unmeasured','Les assistants ont-ils le droit de lire cette page ?',
            'Le fichier robots.txt du site n’a pas été consulté pour cet exemple.',
            'Les assistants envoient leurs propres robots. Un site peut les autoriser ou les écarter dans son fichier robots.txt, indépendamment des moteurs de recherche.',
            'Lancez une analyse sur une adresse en ligne pour obtenir ce constat.', $aiSource, 10);
    } else {
        $access = ai_crawler_access($robotsText, parse_url($url, PHP_URL_PATH) ?: '/');
        $blocked = $access['blocked'];
        if (!$blocked) {
            $add('GEO-AI-CRAWLERS','GEO','ok','Les assistants ont-ils le droit de lire cette page ?',
                'Robots vérifiés : '.implode(', ', AI_CRAWLERS).'. Aucun n’est écarté par votre fichier robots.txt.',
                'Les assistants envoient leurs propres robots. Votre fichier robots.txt les laisse passer : rien, de ce côté, ne les empêche de lire cette page. Cela ne garantit pas qu’ils la liront ni qu’ils la citeront.',
                'Rien à modifier pour ce contrôle. Si vous souhaitez au contraire écarter certains de ces robots, c’est une décision à prendre avec la personne qui gère le site.',
                $aiSource, 10);
        } else {
            $detail = [];
            foreach ($blocked as $agent => $origin) $detail[] = $agent.' ('.$origin.')';
            $general = in_array('règle générale', $blocked, true);
            $add('GEO-AI-CRAWLERS','GEO','review','Les assistants ont-ils le droit de lire cette page ?',
                'Écartés par votre fichier robots.txt : '.implode(', ', $detail).'. Autorisés : '.($access['allowed'] ? implode(', ', $access['allowed']) : 'aucun').'.',
                'Les assistants envoient leurs propres robots. Ceux qui sont écartés ne liront pas cette page et ne pourront donc pas s’en servir pour répondre. Écarter ces robots est un choix légitime, que beaucoup de sites font volontairement.',
                ($general
                    ? 'Une partie de ces robots est écartée par une règle qui vise tous les robots, souvent sans intention particulière à leur égard. Décidez si c’est bien ce que vous vouliez, puis faites ajuster le fichier robots.txt en conséquence.'
                    : 'Ces robots sont nommés explicitement dans votre fichier robots.txt : le choix semble délibéré. Si ce n’est pas le vôtre, demandez à la personne qui gère le site pourquoi ces règles sont présentes.'),
                $aiSource, 10);
        }
    }
    $goals = [
        'association'=>'Une personne comprend-elle votre mission, votre territoire et comment participer ?',
        'activite'=>'Une personne comprend-elle votre offre, la zone desservie et comment vous contacter ?',
        'publication'=>'Le lecteur identifie-t-il les auteurs, les sources et les dates utiles ?',
    ];
    $goal = isset($goals[$goal]) ? $goal : 'association';
    foreach (iterator_to_array($x->query('//body//script|//body//style|//body//template')) as $node) $node->parentNode->removeChild($node);
    // Joined with a space: textContent alone would weld the last word of a block
    // to the first word of the next one and undercount.
    $texts = [];
    foreach ($x->query('//body//text()') as $node) { $value = $clean($node->textContent); if ($value !== '') $texts[] = $value; }
    $wordCount = count(preg_split('/\s+/u', implode(' ', $texts), -1, PREG_SPLIT_NO_EMPTY));
    // A page whose initial HTML holds almost no text gives an assistant nothing
    // to read, whatever JavaScript adds afterwards.
    $thin = $wordCount < 50;
    $add('GEO-USEFULNESS','GEO',$thin ? 'action':'review','Un visiteur comprend-il ce que vous proposez ?',
        'Environ '.$wordCount.' mot(s) de texte dans le HTML reçu, avant exécution du JavaScript. '.($thin ? 'C’est très peu : un robot qui n’exécute pas le JavaScript ne trouve presque rien à lire. ' : '').$goals[$goal],'Les informations fiables, explicites et utiles aux lecteurs forment le socle d’un contenu exploitable. Un automate ne peut pas certifier votre expertise.',($thin ? 'Vérifiez d’abord que votre texte est bien présent dans la page livrée et non ajouté ensuite par du JavaScript : montrez ce constat à la personne qui gère le site. Reprenez ensuite la question ci-dessus avec une personne extérieure.' : 'Demandez à une personne qui ne connaît pas votre site de lire cette page, puis posez-lui la question affichée ci-dessus. Si elle ne trouve pas la réponse, ajoutez les informations manquantes sur la page. Si elle comprend, gardez votre contenu.'),$google.'fundamentals/creating-helpful-content',20);
    $add('GEO-CITATIONS','GEO','unmeasured','Votre site apparaît-il dans les réponses des IA ?','Aucun service IA interrogé. Aucune donnée de citation connectée.','Une analyse HTML ne mesure pas votre présence dans les réponses des assistants.','Ce rapport ne permet pas de répondre. Pour un premier essai, posez à votre assistant une question qu’un visiteur pourrait poser sur votre activité, puis regardez s’il cite votre site. Un seul essai ne suffit pas à mesurer votre visibilité : les réponses peuvent varier.',$google.'appearance/ai-features',30);
    return ['schemaVersion'=>'1.0','engineVersion'=>VERSION,'generatedAt'=>gmdate('c'),'url'=>$url,'goal'=>$goal,'scope'=>'Une page HTML reçue par le serveur, sans exécution JavaScript.','limitations'=>[
        'Pas d’exploration du site, de contrôle des liens cassés ou d’analyse des autres pages.',
        'Indexation réelle, positions, popularité, vitesse vécue et citations IA non mesurées.',
        'Aucune note de classement ; les constats positifs attestent uniquement du contrôle indiqué.',
        'Respect prudent de robots.txt : les exceptions Allow ne sont pas interprétées.',
    ],'checks'=>$checks];
}
