<?php
declare(strict_types=1);

if (!defined('LSDN_CONTACT_RELAY')) {
    http_response_code(404);
    exit;
}

/**
 * En-tête `t=<secondes>,v1=<hmac-sha256 hex de "t.corps">`, vérifié par l'admin
 * (core/lsdn/contact.ts). Le horodatage signé borne le rejeu à cinq minutes.
 */
function contact_relay_signature(string $body, string $secret, int $timestamp): string
{
    return 't=' . $timestamp . ',v1=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
}

/**
 * Copie le message dans l'admin pour qu'il ne se perde pas si le mail n'arrive
 * pas. Délai court : un admin injoignable ne doit pas faire attendre la personne.
 */
function relay_contact_to_admin(array $fields, string $endpoint, string $secret): bool
{
    if ($endpoint === '' || strlen($secret) < 32 || !function_exists('curl_init')) {
        return false;
    }

    $body = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($body)) {
        return false;
    }

    $ch = curl_init($endpoint);
    if ($ch === false) {
        return false;
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-LSDN-Signature: ' . contact_relay_signature($body, $secret, time()),
        ],
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($status !== 200 || !is_string($response)) {
        error_log('[contact] relais admin en échec (HTTP ' . $status . ')');
        return false;
    }
    $decoded = json_decode($response, true);
    return is_array($decoded) && ($decoded['ok'] ?? false) === true;
}
