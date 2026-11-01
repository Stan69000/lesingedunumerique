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
check($empty['checks'][0]['status']==='action','missing title');
$none=\Octet\analyze_html('<html><head><meta name="robots" content="none"></head><body>x</body></html>','https://example.com/');
check(array_column($none['checks'],null,'id')['SEO-NOINDEX']['status']==='review','robots none');
check(count($report['checks'])===11,'stable scope');

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
echo "$count checks passed\n";
