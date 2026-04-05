<?php
declare(strict_types=1);

function env_value(string $key, string $default = ''): string
{
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

    return $default;
}

$recipient = env_value('CONTACT_RECIPIENT_EMAIL', 'contact@lesingedunumerique.fr');
$fromEmail = env_value('CONTACT_FROM_EMAIL', 'contact@lesingedunumerique.fr');
$turnstileSecret = env_value('TURNSTILE_SECRET_KEY');

const MAX_FIRST_NAME_LENGTH = 80;
const MAX_LAST_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_WINDOW_SECONDS = 600;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const TURNSTILE_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function sanitize_mail_header_value(string $value): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $value));
}

function redirect_with_status(string $status): never
{
    header('Cache-Control: no-store');
    header('Location: /contact/?status=' . rawurlencode($status), true, 303);
    exit;
}

function log_contact_issue(string $message): void
{
    error_log('[contact] ' . $message);
}

function is_valid_email_address(string $email): bool
{
    return strlen($email) <= MAX_EMAIL_LENGTH && (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function has_valid_same_origin(): bool
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        return false;
    }

    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '') {
        $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
        if ($originHost === $host) {
            return true;
        }
    }

    $referer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));
    if ($referer !== '') {
        $refererHost = strtolower((string) parse_url($referer, PHP_URL_HOST));
        if ($refererHost === $host) {
            return true;
        }
    }

    return false;
}

function get_rate_limit_file_path(string $ipAddress): string
{
    $safeKey = hash('sha256', $ipAddress);
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'contact_rate_' . $safeKey . '.json';
}

function is_rate_limited(string $ipAddress): bool
{
    if ($ipAddress === '') {
        return false;
    }

    $filePath = get_rate_limit_file_path($ipAddress);
    $now = time();
    $attempts = [];

    if (is_file($filePath)) {
        $raw = @file_get_contents($filePath);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            foreach ($decoded as $timestamp) {
                if (is_int($timestamp) && ($now - $timestamp) < RATE_LIMIT_WINDOW_SECONDS) {
                    $attempts[] = $timestamp;
                }
            }
        }
    }

    if (count($attempts) >= RATE_LIMIT_MAX_ATTEMPTS) {
        return true;
    }

    $attempts[] = $now;
    @file_put_contents($filePath, json_encode($attempts), LOCK_EX);

    return false;
}

function validate_config_emails(string $recipient, string $fromEmail): bool
{
    return is_valid_email_address($recipient) && is_valid_email_address($fromEmail);
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

function verify_turnstile(string $secret, string $token, string $remoteIp): string
{
    if ($secret === '') {
        log_contact_issue('turnstile secret missing');
        return 'config_turnstile_missing';
    }

    if ($token === '') {
        log_contact_issue('turnstile token missing in POST payload');
        return 'captcha_missing';
    }

    $payload = [
        'secret' => $secret,
        'response' => $token,
    ];
    if ($remoteIp !== '') {
        $payload['remoteip'] = $remoteIp;
    }

    $rawResponse = post_form(TURNSTILE_VERIFY_ENDPOINT, $payload);
    if ($rawResponse === null) {
        log_contact_issue('turnstile siteverify request failed');
        return 'error';
    }

    $decoded = json_decode($rawResponse, true);
    if (!is_array($decoded)) {
        log_contact_issue('turnstile siteverify returned invalid JSON');
        return 'error';
    }

    if (($decoded['success'] ?? false) === true) {
        return 'ok';
    }

    $errorCodes = $decoded['error-codes'] ?? [];
    if (!is_array($errorCodes)) {
        log_contact_issue('turnstile siteverify failed without error-codes');
        return 'captcha';
    }

    $codesForLog = [];
    foreach ($errorCodes as $code) {
        if (is_string($code) && $code !== '') {
            $codesForLog[] = $code;
        }
    }
    if ($codesForLog !== []) {
        log_contact_issue('turnstile siteverify failed: ' . implode(',', $codesForLog));
    }

    foreach ($errorCodes as $code) {
        if ($code === 'missing-input-secret' || $code === 'invalid-input-secret') {
            return 'config_turnstile_secret';
        }
        if ($code === 'missing-input-response') {
            return 'captcha_missing';
        }
    }

    return 'captcha';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_with_status('error');
}

if (!validate_config_emails($recipient, $fromEmail)) {
    redirect_with_status('config_email');
}

if ($turnstileSecret === '') {
    redirect_with_status('config_turnstile_missing');
}

if (!has_valid_same_origin()) {
    redirect_with_status('invalid');
}

$ipAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
if (is_rate_limited($ipAddress)) {
    redirect_with_status('error');
}

$turnstileToken = trim((string) ($_POST['cf-turnstile-response'] ?? ''));
$turnstileStatus = verify_turnstile($turnstileSecret, $turnstileToken, $ipAddress);
if ($turnstileStatus !== 'ok') {
    redirect_with_status($turnstileStatus);
}

$csrfToken = trim((string) ($_POST['csrf_token'] ?? ''));
$csrfCookie = trim((string) ($_COOKIE['contact_csrf'] ?? ''));
if ($csrfToken === '' || $csrfCookie === '' || !hash_equals($csrfCookie, $csrfToken)) {
    redirect_with_status('invalid');
}
if (!preg_match('/^[a-f0-9]{64}$/', $csrfToken)) {
    redirect_with_status('invalid');
}

$website = trim((string) ($_POST['website'] ?? ''));
if ($website !== '') {
    redirect_with_status('sent');
}

$startedAt = trim((string) ($_POST['form_started_at'] ?? ''));
if ($startedAt === '' || !ctype_digit($startedAt)) {
    redirect_with_status('invalid');
}

$submittedAt = (int) floor(microtime(true) * 1000);
$elapsed = $submittedAt - (int) $startedAt;
if ($elapsed < 2500) {
    redirect_with_status('sent');
}

$firstName = trim((string) ($_POST['first_name'] ?? ''));
$lastName = trim((string) ($_POST['last_name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$subject = trim((string) ($_POST['subject'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

if ($firstName === '' || $lastName === '' || $email === '' || $subject === '' || $message === '') {
    redirect_with_status('missing');
}

if (
    mb_strlen($firstName) > MAX_FIRST_NAME_LENGTH
    || mb_strlen($lastName) > MAX_LAST_NAME_LENGTH
    || mb_strlen($phone) > MAX_PHONE_LENGTH
    || mb_strlen($subject) > MAX_SUBJECT_LENGTH
    || mb_strlen($message) > MAX_MESSAGE_LENGTH
) {
    redirect_with_status('invalid');
}

if (!is_valid_email_address($email)) {
    redirect_with_status('invalid');
}

$safeSubject = sanitize_mail_header_value($subject);
$safeName = sanitize_mail_header_value(trim($firstName . ' ' . $lastName));
$safePhone = sanitize_mail_header_value($phone);

$bodyLines = [
    "Nouveau message depuis le site Le Singe Du Numérique",
    '',
    'Prénom : ' . $firstName,
    'Nom : ' . $lastName,
    'Mail : ' . $email,
    'Téléphone : ' . ($safePhone !== '' ? $safePhone : 'Non renseigné'),
    'Objet : ' . $safeSubject,
    '',
    "Message :",
    str_replace("\0", '', $message),
];

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Le Singe Du Numérique <' . sanitize_mail_header_value($fromEmail) . '>',
    'Reply-To: ' . $safeName . ' <' . $email . '>',
];

$sent = mail(
    sanitize_mail_header_value($recipient),
    '[Contact site] ' . $safeSubject,
    implode("\n", $bodyLines),
    implode("\r\n", $headers)
);

if (!$sent) {
    redirect_with_status('error');
}

redirect_with_status('sent');
