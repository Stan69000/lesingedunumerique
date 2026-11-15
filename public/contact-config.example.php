<?php
declare(strict_types=1);

return [
    'CONTACT_RECIPIENT_EMAIL' => 'contact@lesingedunumerique.fr',
    'CONTACT_FROM_EMAIL' => 'contact@lesingedunumerique.fr',
    'TURNSTILE_SECRET_KEY' => 'replace-with-your-secret-key',
    // Jeton du endpoint /contact-health.php (openssl rand -hex 32).
    'CONTACT_HEALTH_TOKEN' => 'replace-with-your-health-token',
    // Copie de chaque message dans l'admin (même valeur que LSDN_CONTACT_SECRET côté admin, openssl rand -hex 32).
    'CONTACT_ADMIN_ENDPOINT' => 'https://admin.stan-bouchet.fr/api/public/lsdn/contact',
    'CONTACT_ADMIN_SECRET' => 'replace-with-your-relay-secret',
];
