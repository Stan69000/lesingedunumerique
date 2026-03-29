<?php
declare(strict_types=1);

$recipient = getenv('CONTACT_RECIPIENT_EMAIL') ?: '';
$fromEmail = getenv('CONTACT_FROM_EMAIL') ?: 'no-reply@lesingedunumerique.fr';

function redirect_with_status(string $status): never
{
    header('Location: /contact/?status=' . rawurlencode($status), true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_with_status('error');
}

if ($recipient === '') {
    redirect_with_status('config');
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

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    redirect_with_status('invalid');
}

$safeSubject = str_replace(["\r", "\n"], ' ', $subject);
$safeName = trim($firstName . ' ' . $lastName);

$bodyLines = [
    "Nouveau message depuis le site Le Singe Du Numérique",
    '',
    'Prénom : ' . $firstName,
    'Nom : ' . $lastName,
    'Mail : ' . $email,
    'Téléphone : ' . ($phone !== '' ? $phone : 'Non renseigné'),
    'Objet : ' . $safeSubject,
    '',
    "Message :",
    $message,
];

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Le Singe Du Numérique <' . $fromEmail . '>',
    'Reply-To: ' . $safeName . ' <' . $email . '>',
];

$sent = mail(
    $recipient,
    '[Contact site] ' . $safeSubject,
    implode("\n", $bodyLines),
    implode("\r\n", $headers)
);

if (!$sent) {
    redirect_with_status('error');
}

redirect_with_status('sent');
