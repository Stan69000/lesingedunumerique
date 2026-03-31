<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');

function env_value(string $key): string
{
    $value = getenv($key);
    if (is_string($value) && trim($value) !== '') {
        return $value;
    }

    $serverValue = $_SERVER[$key] ?? '';
    if (is_string($serverValue) && trim($serverValue) !== '') {
        return $serverValue;
    }

    $envValue = $_ENV[$key] ?? '';
    if (is_string($envValue) && trim($envValue) !== '') {
        return $envValue;
    }

    return '';
}

$required = [
    'TURNSTILE_SECRET_KEY',
    'CONTACT_RECIPIENT_EMAIL',
    'CONTACT_FROM_EMAIL',
];

foreach ($required as $key) {
    if (env_value($key) === '') {
        http_response_code(503);
        echo 'MISSING_CONFIG';
        exit;
    }
}

http_response_code(200);
echo 'OK';
