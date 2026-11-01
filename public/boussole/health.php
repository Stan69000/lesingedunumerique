<?php
declare(strict_types=1);
// Readable with a plain GET so deployment checks never need a POST: the hosting
// firewall challenges POST requests coming from datacenter addresses. Reports
// only what the audit already discloses, and never reaches the network itself.
require_once __DIR__.'/engine.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
$curl = extension_loaded('curl');
$dom = extension_loaded('dom');
http_response_code($curl && $dom ? 200 : 503);
echo json_encode([
    'engineVersion' => \Octet\VERSION,
    'curl' => $curl,
    'dom' => $dom,
    'ready' => $curl && $dom,
], JSON_UNESCAPED_UNICODE);
