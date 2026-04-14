<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');

function env_value(string $key): string
{
    static $localConfig = null;
    if ($localConfig === null) {
        $localConfigPath = __DIR__ . '/contact-config.local.php';
        if (is_file($localConfigPath)) {
            $loaded = require $localConfigPath;
            $localConfig = is_array($loaded) ? $loaded : [];
        } else {
            $localConfig = [];
        }
    }

    $localValue = $localConfig[$key] ?? '';
    if (is_string($localValue) && trim($localValue) !== '') {
        return trim($localValue);
    }

    $value = getenv($key);
    if (is_string($value) && trim($value) !== '') {
        return trim($value);
    }

    $serverValue = $_SERVER[$key] ?? '';
    if (is_string($serverValue) && trim($serverValue) !== '') {
        return trim($serverValue);
    }

    $envValue = $_ENV[$key] ?? '';
    if (is_string($envValue) && trim($envValue) !== '') {
        return trim($envValue);
    }

    return '';
}

function first_env_value(array $keys): string
{
    foreach ($keys as $key) {
        if (!is_string($key) || $key === '') {
            continue;
        }
        $value = env_value($key);
        if ($value !== '') {
            return $value;
        }
    }

    return '';
}

function post_form(string $url, array $fields): ?string
{
    $body = http_build_query($fields);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            return null;
        }
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        $response = curl_exec($ch);
        curl_close($ch);

        return is_string($response) ? $response : null;
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 10,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);

    return is_string($response) ? $response : null;
}

$recipient = env_value('CONTACT_RECIPIENT_EMAIL');
$fromEmail = env_value('CONTACT_FROM_EMAIL');
$turnstileSecret = first_env_value([
    'TURNSTILE_SECRET_KEY',
    'CLOUDFLARE_TURNSTILE_SECRET_KEY',
    'CF_TURNSTILE_SECRET_KEY',
]);

$required = [
    'TURNSTILE_SECRET_KEY' => $turnstileSecret,
    'CONTACT_RECIPIENT_EMAIL' => $recipient,
    'CONTACT_FROM_EMAIL' => $fromEmail,
];

foreach ($required as $key => $value) {
    if ($value === '') {
        http_response_code(503);
        echo 'MISSING_CONFIG:' . $key;
        exit;
    }
}

if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(503);
    echo 'INVALID_EMAIL_CONFIG';
    exit;
}

// Secret check: use an intentionally invalid token.
// With a valid secret, Cloudflare should return "invalid-input-response" (not "invalid-input-secret").
$rawResponse = post_form('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
    'secret' => $turnstileSecret,
    'response' => 'health-check-token',
]);

if ($rawResponse === null) {
    http_response_code(503);
    echo 'TURNSTILE_CHECK_FAILED';
    exit;
}

$decoded = json_decode($rawResponse, true);
if (!is_array($decoded)) {
    http_response_code(503);
    echo 'TURNSTILE_CHECK_FAILED';
    exit;
}

$errorCodes = $decoded['error-codes'] ?? [];
if (!is_array($errorCodes)) {
    http_response_code(503);
    echo 'TURNSTILE_CHECK_FAILED';
    exit;
}

if (in_array('invalid-input-secret', $errorCodes, true) || in_array('missing-input-secret', $errorCodes, true)) {
    http_response_code(503);
    echo 'INVALID_TURNSTILE_SECRET';
    exit;
}

http_response_code(200);
echo 'OK';
