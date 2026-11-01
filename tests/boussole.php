<?php
require_once __DIR__.'/../public/boussole/engine.php';
$count=0;
function check(bool $ok,string $name):void {global $count; $count++;if(!$ok)throw new RuntimeException($name);}
foreach (['http://127.0.0.1','http://localhost','http://example.com:22','https://user:pass@example.com','https://example.com/?token=secret','file:///etc/passwd','http://[::1]','https://example.com\\@localhost'] as $url) {
    try { \Octet\normalize_url($url); throw new LogicException('Accepted '.$url); } catch (RuntimeException $e) {$count++;}
}
foreach (['127.0.0.1','10.1.2.3','169.254.169.254','100.64.1.1','192.0.2.1','198.18.1.1','224.0.0.1','255.255.255.255','::1'] as $ip) check(!\Octet\public_ipv4($ip), 'Reject '.$ip);
check(\Octet\public_ipv4('1.1.1.1'),'public IP');
check(\Octet\normalize_url('example.com')==='https://example.com/','normalize');
check(\Octet\resolve_location('https://example.com/a/b','../c')==='https://example.com/c','relative redirect');
check(\Octet\robots_denies("User-agent: *\nDisallow: /private",'/private/a'),'robots denied');
check(!\Octet\robots_denies("User-agent: other\nDisallow: /",'/'),'other robot');
check(\Octet\robots_denies("User-agent: *\nDisallow: /*.pdf$",'/book.pdf'),'robots wildcard');
check(!\Octet\robots_denies("User-agent: *\nDisallow: /*.pdf$",'/book.pdf/page'),'robots end');
$report=\Octet\analyze_html('<html lang="fr"><head><title>Une association</title><meta name="ROBOTS" content="noindex"><meta name="description" content="Ateliers pour tous"><meta name="viewport" content="width=device-width"></head><body><h1>Bonjour</h1><img src="x"><img src="y" alt=""><script type="application/ld+json">{bad}</script></body></html>','https://example.com/');
$checks=array_column($report['checks'],null,'id');
check($checks['SEO-TITLE']['evidence']==='Une association','title');
check($checks['SEO-NOINDEX']['status']==='review','noindex intentional');
check(str_starts_with($checks['CONTENT-IMAGES']['evidence'],'1 image'),'decorative alt accepted');
check($checks['GEO-STRUCTURE']['status']==='action','invalid JSON');
check($checks['GEO-CITATIONS']['status']==='unmeasured','citations not invented');
$empty=\Octet\analyze_html('<html><body>Test</body></html>','https://example.com/');
check(array_column($empty['checks'],null,'id')['SEO-TITLE']['status']==='action','missing title');
$none=\Octet\analyze_html('<html><head><meta name="robots" content="none"></head><body>x</body></html>','https://example.com/');
check(array_column($none['checks'],null,'id')['SEO-NOINDEX']['status']==='review','robots none');
check(count($report['checks'])===14,'stable scope');

// Realistic regression cases: a root slash must not alarm a beginner, while
// a different host, scheme or article path must never be silently accepted.
function canonical_test(string $head, string $url='https://rvaz.fr/'): array {
    $report=\Octet\analyze_html('<html><head>'.$head.'</head><body><h1>Test</h1></body></html>',$url);
    return array_column($report['checks'],null,'id')['SEO-CANONICAL'];
}
$root=canonical_test('<link rel="canonical" href="https://rvaz.fr">');
check($root['status']==='ok','root slash is not a canonical warning');
check(str_contains($root['action'],'Rien à modifier'),'self canonical gives an explicit no-action instruction');
check(canonical_test('<link rel="canonical" href="https://RVAZ.FR:443/">')['status']==='ok','host case and default port');
check(canonical_test('<link rel="canonical" href="https://www.rvaz.fr/">')['status']==='review','www is a different declared address');
check(canonical_test('<link rel="canonical" href="http://rvaz.fr/">')['status']==='review','HTTP is not silently equated with HTTPS');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/">','https://rvaz.fr/reportages')['status']==='review','an article pointing to home needs confirmation');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/reportages/">','https://rvaz.fr/reportages')['status']==='review','non-root trailing slash is not erased');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/reportages">','https://rvaz.fr/reportages')['status']==='ok','each page can declare its own address');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/?page=2">')['status']==='review','query is not discarded');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/#section">')['status']==='review','fragment canonical is not validated');
check(canonical_test('<link rel="canonical" href="https://user:pass@rvaz.fr/">')['status']==='review','credentials in canonical are not validated');
check(canonical_test('<link rel="canonical" href="/">')['status']==='review','relative canonical is left for technical confirmation');
check(canonical_test('<link rel="canonical" href="">')['status']==='review','empty canonical is not validated');
check(canonical_test('<link rel="canonical" href="https://rvaz.fr/"><link rel="canonical" href="https://rvaz.fr/reportages">')['status']==='review','multiple declarations are not validated');
check(canonical_test('<link rel="canonical" hreflang="fr" href="https://rvaz.fr/">')['status']==='review','unsupported link attributes are not validated');
$absent=canonical_test('');
check($absent['status']==='suggestion','missing canonical is not an automatic error');
check(str_contains($absent['action'],'Ne changez rien'),'missing canonical advice is conditional');
check(canonical_test('')['source']==='https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls','source retained');
// A string containing only separator spaces must never become an empty proof.
$emptyChecks=array_column($empty['checks'],null,'id');
check($emptyChecks['SEO-NOINDEX']['evidence']==='Aucune directive noindex détectée dans le HTML ou les en-têtes.','missing robots has an explicit observation');
foreach ([['<meta name="robots" content="   ">',[], 'ok'],['<meta name="robots" content="index, follow">',[], 'ok'],['<meta name="googlebot" content=" noindex ">',[], 'review'],['',['x-robots-tag'=>[' noindex ']],'review']] as [$head,$headers,$status]) {
    $sample=\Octet\analyze_html('<html><head>'.$head.'</head><body>Test</body></html>','https://example.com/','association',$headers);
    $found=array_column($sample['checks'],null,'id')['SEO-NOINDEX'];
    check($found['status']===$status && trim($found['evidence'])!=='','robots observation remains visible and preserves blocking detection');
    foreach ($sample['checks'] as $finding) check(trim($finding['evidence'])!=='','nonempty observation for '.$finding['id']);
}

$links=\Octet\discover_links('<a href="/article/">Article</a><a href="/article/#section">Same</a><a href="suite/">Relative</a><a href="../autre">Parent</a><a href="https://elsewhere.com/">External</a><a href="//elsewhere.com/">External</a><a href="/fichier.pdf">PDF</a><a href="/a?token=secret">Query</a><a href="#bas">Anchor</a><a href="mailto:a@example.com">Mail</a><a href="/logout">Logout</a><a href="/prive" rel="nofollow">Nofollow</a><a href="/download" download>Download</a><a href="http://example.com/">Downgrade</a><a href="https://user:pass@example.com/">Credentials</a>', 'https://example.com/dossier/');
check($links===['https://example.com/article/','https://example.com/dossier/suite/','https://example.com/autre'],'discovery stays on origin, deduplicates, preserves directory slashes and skips unsafe/non-HTML links');
check(\Octet\discover_links('<base href="https://elsewhere.com/"><a href="page">x</a>','https://example.com/')===[],'base elements are not guessed');
$many='';for($i=0;$i<100;$i++)$many.='<a href="/page-'.$i.'">Page</a>';
check(count(\Octet\discover_links($many,'https://example.com/'))===80,'link discovery remains bounded');
check(\Octet\resolve_location('https://example.com/dir/','next/')==='https://example.com/dir/next/','relative directory link is retained');
try { \Octet\fetch_public('https://example.com/',microtime(true)-1);check(false,'expired budget rejected before DNS'); }
catch (RuntimeException $e) {check(str_contains($e->getMessage(),'délai'),'expired budget has an explicit error');}
// A finding must show what was found, not how many of it there were.
$only = static function (string $html, string $id) {
    foreach (\Octet\analyze_html($html, 'https://example.com/page')['checks'] as $c) if ($c['id'] === $id) return $c;
    throw new RuntimeException($id.' absent du rapport');
};
$head = $only('<html><body><h1>Nos ateliers du mardi</h1></body></html>', 'CONTENT-HEADINGS');
check(str_contains($head['evidence'], 'Nos ateliers du mardi'), 'the heading the reader is asked to judge is shown');
check(str_contains($head['action'], 'ci-dessus'), 'the advice points at the heading instead of sending the reader hunting');
$twoHeads = $only('<html><body><h1>Un</h1><h1>Deux</h1></body></html>', 'CONTENT-HEADINGS');
check(str_contains($twoHeads['evidence'], 'un seul est attendu') && str_contains($twoHeads['action'], 'sous-titres'), 'several headings are named and explained');
check(str_contains($only('<html><body><p>x</p></body></html>', 'CONTENT-HEADINGS')['evidence'], 'Aucun grand titre'), 'a missing heading says so plainly');

$noAlt = $only('<html><body><img src="/img/atelier-2024.png"><img src="/img/logo.svg" alt="Logo"></body></html>', 'CONTENT-IMAGES');
check(str_contains($noAlt['evidence'], 'atelier-2024.png'), 'the image without a description is named');
check(!str_contains($noAlt['evidence'], 'logo.svg'), 'an image that has its description is not blamed');
$decorative = $only('<html><body><img src="a.png" alt=""></body></html>', 'CONTENT-IMAGES');
check($decorative['status'] === 'ok' && str_contains($decorative['evidence'], 'décorative'), 'an empty description is read as a decorative image');

check(\Octet\ld_types(['@graph'=>[['@type'=>'Organization'],['@type'=>['Blog','WebPage']]]]) === ['Organization','Blog','WebPage'], 'types are collected through @graph and arrays');
$ld = $only('<html><body><script type="application/ld+json">{"@type":"Organization","name":"X"}</script></body></html>', 'GEO-STRUCTURE');
check(str_contains($ld['evidence'], 'Organization'), 'the declared type is named instead of counted');
check(str_contains($ld['action'], 'nom et les coordonnées'), 'the advice says what to compare for that type');
$badLd = $only('<html><body><script type="application/ld+json">{bad}</script></body></html>', 'GEO-STRUCTURE');
check($badLd['status'] === 'action' && str_contains($badLd['evidence'], 'syntaxe JSON'), 'an unreadable block stays an action and says why');

// Which assistant crawlers robots.txt turns away is the one thing about AI
// visibility a static read can establish. Blocking them is a choice, not a fault.
$named = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /";
$access = \Octet\ai_crawler_access($named, '/page');
check(array_keys($access['blocked']) === ['GPTBot'], 'a rule naming one crawler blocks only that one');
check($access['blocked']['GPTBot'] === 'règle propre à ce robot', 'a named rule is reported as deliberate');
check(in_array('ClaudeBot', $access['allowed'], true), 'the others stay allowed');
$catchAll = \Octet\ai_crawler_access("User-agent: *\nDisallow: /", '/page');
check(count($catchAll['blocked']) === count(\Octet\AI_CRAWLERS) && $catchAll['allowed'] === [], 'a catch-all rule reaches every assistant crawler');
check($catchAll['blocked']['ClaudeBot'] === 'règle générale', 'a catch-all block is told apart from a named one');
check(\Octet\ai_crawler_access("User-agent: *\nAllow: /", '/page')['blocked'] === [], 'a permissive file blocks nobody');
// A group naming the crawler wins over the catch-all, as the convention requires.
$specific = \Octet\ai_crawler_access("User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /prive", '/page');
check(!isset($specific['blocked']['ClaudeBot']) && isset($specific['blocked']['GPTBot']), 'a named group overrides the catch-all');

$geo = static function (string $html, ?string $robots) {
    foreach (\Octet\analyze_html($html, 'https://example.com/page', 'association', [], $robots)['checks'] as $c) {
        if ($c['id'] === 'GEO-AI-CRAWLERS') return $c;
    }
    throw new RuntimeException('GEO-AI-CRAWLERS absent du rapport');
};
$page = '<html lang="fr"><head><title>T</title></head><body><h1>T</h1><p>'.str_repeat('mot ', 80).'</p></body></html>';
check($geo($page, null)['status'] === 'unmeasured', 'without a robots.txt the crawler access is not guessed');
check($geo($page, "User-agent: *\nAllow: /")['status'] === 'ok', 'a page open to the assistants passes');
$closed = $geo($page, "User-agent: GPTBot\nDisallow: /");
check($closed['status'] === 'review', 'blocking a crawler is a decision to review, never an error');
check(str_contains($closed['evidence'], 'GPTBot') && str_contains($closed['why'], 'choix légitime'), 'the finding names the crawler without blaming the choice');

// Usefulness now carries an observation: how much text the initial HTML holds.
$useful = static function (string $html) {
    foreach (\Octet\analyze_html($html, 'https://example.com/')['checks'] as $c) if ($c['id'] === 'GEO-USEFULNESS') return $c;
    throw new RuntimeException('GEO-USEFULNESS absent');
};
$rich = $useful('<html><body><h1>T</h1><p>'.str_repeat('mot ', 120).'</p></body></html>');
check($rich['status'] === 'review' && str_contains($rich['evidence'], '121 mot'), 'the word count of the initial HTML is reported');
$shell = $useful('<html><body><div id="app"></div><script>var x = "beaucoup de texte dans le script";</script></body></html>');
check($shell['status'] === 'action' && str_contains($shell['action'], 'JavaScript'), 'a page whose text is not in the HTML is an action');
check(!str_contains($shell['evidence'], 'beaucoup de texte'), 'script contents are not counted as readable text');

// Open Graph is what a shared link looks like. Only og:image has no fallback,
// so it alone decides the status; a missing title or description is not a fault.
$social = static function (string $head) {
    foreach (\Octet\analyze_html('<html><head>'.$head.'</head><body><h1>x</h1></body></html>', 'https://example.com/')['checks'] as $c) {
        if ($c['id'] === 'SOCIAL-PREVIEW') return $c;
    }
    throw new RuntimeException('SOCIAL-PREVIEW absent du rapport');
};
$noImage = $social('<meta property="og:title" content="Nos ateliers">');
check($noImage['status'] === 'action' && $noImage['category'] === 'Partage', 'a page with no share image is an action');
check(str_contains($noImage['evidence'], 'og:title'), 'the tags that are declared are still listed');
$relative = $social('<meta property="og:image" content="/images/atelier.png">');
check($relative['status'] === 'action' && str_contains($relative['evidence'], 'n’est pas complète'), 'a relative share image is reported as incomplete');
$good = $social('<meta property="og:image" content="https://example.com/atelier.png">');
check($good['status'] === 'ok' && str_contains($good['evidence'], 'https://example.com/atelier.png'), 'an absolute share image passes and is shown');
check(str_contains($good['why'], 'ne télécharge pas l’image'), 'the report says the image file itself was not checked');
$svg = $social('<meta property="og:image" content="https://example.com/logo.svg">');
check($svg['status'] === 'review' && str_contains($svg['evidence'], 'SVG'), 'an SVG share image is flagged: the big platforms do not render it');
check(str_contains($svg['action'], 'PNG'), 'the SVG advice names a format that works');
check($social('<meta property="og:image" content="https://example.com/carte.png">')['status'] === 'ok', 'a raster share image still passes');
// Publishing tools that emit name= instead of property= must not be penalised.
check($social('<meta name="og:image" content="https://example.com/a.png">')['status'] === 'ok', 'og:image declared with name= is read too');
check($social('<meta property="og:image" content="   ">')['status'] === 'action', 'an empty og:image counts as missing');

// A blocking robots.txt is a finding, not a failure: the page is still never
// fetched, but the visitor is told which rule closed it and to whom.
$all = \Octet\robots_rule("User-agent: *\nDisallow: /prive", '/prive/a');
check($all !== null && $all['agents'] === ['*'] && $all['disallow'] === '/prive', 'a rule for every crawler is named as such');
$ours = \Octet\robots_rule("User-agent: OctetAudit\nDisallow: /", '/page');
check($ours !== null && $ours['agents'] === ['octetaudit'], 'a rule aimed at this tool alone is told apart');
check(\Octet\robots_rule("User-agent: other\nDisallow: /", '/') === null, 'a rule for another robot does not match');

$blocked = \Octet\robots_finding('blocked', 'https://example.com', 'https://example.com/prive/a', ['rule'=>$all]);
check($blocked['id'] === 'SEO-ROBOTS' && $blocked['status'] === 'action', 'a site closed to every crawler is an action');
check(str_contains($blocked['evidence'], 'Disallow: /prive') && str_contains($blocked['evidence'], 'Google'), 'the blocking rule and its reach are shown');
check(($blocked['planEligible'] ?? true) !== false, 'the blocking rule can head the action plan');
$mine = \Octet\robots_finding('blocked', 'https://example.com', 'https://example.com/page', ['rule'=>$ours]);
check($mine['status'] === 'review' && str_contains($mine['why'], 'ne sont pas concernés'), 'excluding this tool alone is not an SEO fault');
$unreadable = \Octet\robots_finding('unreadable', 'https://example.com', 'https://example.com/', ['status'=>500]);
check($unreadable['status'] === 'review' && str_contains($unreadable['evidence'], '500'), 'an unreadable robots.txt reports its HTTP code');

$report = \Octet\robots_report($blocked, 'https://example.com/prive/a', 'https://example.com/prive/a', 'association');
check(count($report['checks']) === 1 && $report['checks'][0]['id'] === 'SEO-ROBOTS', 'a blocked audit returns one explained finding');
// Present in every report now, so a healthy site is told so instead of hearing nothing.
$robotsOf = static function (?string $robots) {
    foreach (\Octet\analyze_html('<html lang="fr"><head><title>T</title></head><body><h1>T</h1><p>'.str_repeat('mot ', 80).'</p></body></html>', 'https://example.com/page', 'association', [], $robots)['checks'] as $c) {
        if ($c['id'] === 'SEO-ROBOTS') return $c;
    }
    throw new RuntimeException('SEO-ROBOTS absent du rapport');
};
$open = $robotsOf("User-agent: *\nAllow: /");
check($open['status'] === 'ok' && str_contains($open['evidence'], 'Aucune de ses règles'), 'a permissive robots.txt is reported as a verified point');
check(str_contains($open['action'], 'noindex'), 'the advice points to noindex for pages meant to stay out of search');
$none = $robotsOf('');
check($none['status'] === 'ok' && str_contains($none['evidence'], 'Aucun fichier robots.txt'), 'a missing file is told apart from a permissive one');
check($robotsOf(null)['status'] === 'unmeasured', 'without a robots.txt the access is not guessed');
// analyze_html is also called on its own, so it evaluates the rule rather than
// trusting that audit_url already cleared the page.
$shut = $robotsOf("User-agent: *\nDisallow: /");
check($shut['status'] === 'action' && str_contains($shut['evidence'], 'Disallow: /'), 'a blocking file read directly is still reported as blocking');
check($report['discoveredLinks'] === [] && str_contains($report['scope'], 'n’a pas été récupérée'), 'the report says the page was never downloaded');
check($report['engineVersion'] === \Octet\VERSION && $report['schemaVersion'] === '1.0', 'the blocked report keeps the usual shape');

// The concurrency slots live in the request script, which cannot be included
// here without running a request. These guard the shape of that fix rather than
// its behaviour: several audits at once, and no allowance spent on a refusal.
$auditSource = file_get_contents(__DIR__.'/../public/boussole/audit.php');
check(preg_match('/const AUDIT_SLOTS = (\\d+);/', $auditSource, $slots) === 1 && (int)$slots[1] >= 2, 'several audits may run side by side');
check(preg_match('/const AUDIT_WAIT_SECONDS = [\\d.]+;/', $auditSource) === 1, 'a saturated tool waits before refusing');
check(!str_contains($auditSource, 'octet-audit-active.lock'), 'the single global lock is gone');
check(strpos($auditSource, '$active = claim_audit_slot();') < strpos($auditSource, '$path = sys_get_temp_dir()'), 'a refusal for load costs no hourly allowance');

echo "$count checks passed\n";
