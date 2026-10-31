<?php
declare(strict_types=1);
$headers = @get_headers('http://127.0.0.1/boussole/audit.php');
exit(is_array($headers) && str_contains($headers[0] ?? '', '405') ? 0 : 1);
