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
echo "$count checks passed\n";
