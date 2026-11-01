<?php
declare(strict_types=1);
require_once __DIR__.'/../public/boussole/engine.php';
$data = [];
foreach (['before','after'] as $state) {
    // The fictional association blocks the assistants before, allows them after.
    $robots = $state === 'before' ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n";
    $r = \Octet\analyze_html(file_get_contents(__DIR__.'/../tests/fixtures/boussole-'.$state.'.html'), 'https://ateliers-du-lien.example/', 'association', [], $robots);
    $r['demo'] = true;
    $r['scenario'] = $state;
    $r['generatedAt'] = '2026-10-31T12:00:00Z';
    $r['scope'] = 'SIMULATION — association fictive. Contrôles exécutés sur un exemple HTML local, sans audit réseau. Aucun site réel évalué.';
    array_unshift($r['limitations'], 'Exemple pédagogique '.($state === 'before' ? 'avant correction.' : 'après corrections fictives.').' Les résultats ne décrivent pas votre site.');
    $data[$state] = $r;
}
echo json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
