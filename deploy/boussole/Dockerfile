FROM php:8.4-apache
# The official image includes cURL and DOM; fail early if that changes.
RUN php -r 'foreach (["curl", "dom"] as $e) { if (!extension_loaded($e)) { fwrite(STDERR, "Missing extension: $e\n"); exit(1); } }'
COPY public/boussole/ /var/www/html/boussole/
COPY deploy/boussole/php.ini /usr/local/etc/php/conf.d/octet.ini
COPY deploy/boussole/apache.conf /etc/apache2/conf-enabled/zz-octet.conf
COPY deploy/boussole/health.php /usr/local/bin/octet-health.php
