<?php
declare(strict_types=1);
require_once __DIR__.'/../public/boussole/engine.php';
$url = $argv[1] ?? '';
if (!$url || in_array($url, ['--help','-h'], true)) {
    echo "Boussole d’Octet — PHP 8.1+, cURL et DOM\nUsage : php scripts/octet-audit.php https://exemple.fr [--goal=association|activite|publication]\nSortie : JSON sur stdout. Erreurs sur stderr. Réseau public uniquement.\n"; exit($url ? 0:1);
}
$goal = 'association';
foreach (array_slice($argv,2) as $arg) {
    if (!preg_match('/^--goal=(association|activite|publication)$/',$arg,$m)) { fwrite(STDERR,"Option inconnue : $arg\n"); exit(1); }
    $goal = $m[1];
}
try { echo json_encode(\Octet\audit_url($url,$goal), JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE)."\n"; }
catch (\Throwable $e) { fwrite(STDERR,$e->getMessage()."\n"); exit(1); }
