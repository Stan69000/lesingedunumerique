<?php
declare(strict_types=1);
require_once __DIR__.'/engine.php';
if (function_exists('set_time_limit')) @set_time_limit(35);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
function reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); reply(405,['error'=>'L’analyse se lance depuis le formulaire.']); }
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $host = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    if ($host !== preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '')) reply(403,['error'=>'Origine non autorisée.']);
}
if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) reply(415,['error'=>'Format JSON requis.']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) reply(413,['error'=>'Demande trop volumineuse.']);
$raw = file_get_contents('php://input', false, null, 0, 4097);
if (strlen($raw) > 4096) reply(413,['error'=>'Demande trop volumineuse.']);
$input = json_decode($raw, true);
if (!is_array($input) || !is_string($input['url'] ?? null) || !is_string($input['goal'] ?? 'association')) reply(400,['error'=>'Adresse invalide.']);
if (!extension_loaded('curl') || !extension_loaded('dom')) reply(503,['error'=>'Le serveur doit disposer des extensions PHP cURL et DOM.']);
// Fixed-size limiter file per hour; no URLs or raw IP addresses are stored.
$path = sys_get_temp_dir().'/octet-audit-'.gmdate('YmdH').'.json';
$lock = @fopen($path, 'c+');
if (!$lock || !flock($lock, LOCK_EX)) reply(503,['error'=>'L’analyse est momentanément indisponible.']);
$state = json_decode(stream_get_contents($lock), true) ?: [];
$key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown').gmdate('YmdH'));
if (($state[$key] ?? 0) >= 10 || ($state['_total'] ?? 0) >= 100) {
    flock($lock,LOCK_UN); fclose($lock); header('Retry-After: 3600'); reply(429,['error'=>'Limite d’analyses atteinte. Réessayez dans une heure.']);
}
$state[$key] = ($state[$key] ?? 0)+1; $state['_total'] = ($state['_total'] ?? 0)+1;
ftruncate($lock,0); rewind($lock); fwrite($lock,json_encode($state)); fflush($lock); flock($lock,LOCK_UN); fclose($lock);
// Delete only expired files belonging to this limiter.
foreach (glob(sys_get_temp_dir().'/octet-audit-??????????.json') ?: [] as $old) if (filemtime($old) < time()-7200) @unlink($old);
// One network audit at a time protects the shared PHP hosting.
$active = @fopen(sys_get_temp_dir().'/octet-audit-active.lock', 'c+');
if (!$active || !flock($active, LOCK_EX | LOCK_NB)) {
    header('Retry-After: 30'); reply(503,['error'=>'Octet analyse déjà une page. Réessayez dans quelques instants.']);
}
try { reply(200, \Octet\audit_url($input['url'], $input['goal'] ?? 'association')); }
catch (\RuntimeException $e) { reply(422,['error'=>$e->getMessage()]); }
catch (\Throwable $e) { reply(503,['error'=>'L’analyse n’a pas pu aboutir. Réessayez plus tard.']); }
