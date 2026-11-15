<?php
declare(strict_types=1);

const LSDN_CONTACT_RELAY = true;
require_once __DIR__ . '/../public/contact-relay.php';

$expected = 't=1700000000,v1=' . hash_hmac('sha256', '1700000000.{"a":"é"}', str_repeat('x', 40));
if (contact_relay_signature('{"a":"é"}', str_repeat('x', 40), 1700000000) !== $expected) {
    throw new RuntimeException('signature');
}
if (relay_contact_to_admin(['a' => 1], '', str_repeat('x', 40)) !== false) {
    throw new RuntimeException('endpoint vide');
}
if (relay_contact_to_admin(['a' => 1], 'https://example.invalid/', 'court') !== false) {
    throw new RuntimeException('secret trop court');
}
echo "contact-relay: ok\n";
