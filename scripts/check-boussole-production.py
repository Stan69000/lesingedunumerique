"""Verify the deployed pages and the PHP engine using plain GET requests.

O2Switch answers POST requests coming from datacenter addresses with a 503
CAPTCHA page from its firewall, so this check never POSTs: a red deploy would
describe the runner's reputation, not the site. The engine's real network
behaviour is exercised before the deploy by scripts/octet-audit.php, which runs
on the runner itself and therefore never crosses that firewall.
"""
import html
import json
import pathlib
import re
import time
import urllib.error
import urllib.request

BASE = 'https://lesingedunumerique.fr'
ENGINE = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'boussole' / 'engine.php'
PAGES = [
    ('/outils/', 'La Boussole'),
    ('/outils/boussole/', 'audit-form'),
    ('/lexique/', 'MCP'),
    ('/blog/votre-site-est-en-ligne-octet-sort-sa-boussole/', 'Octet sort sa boussole'),
]


def expected_version():
    match = re.search(r"const VERSION\s*=\s*'([^']+)'", ENGINE.read_text(encoding='utf-8'))
    assert match, f'No VERSION constant in {ENGINE}'
    return match.group(1)


def request(path):
    req = urllib.request.Request(BASE + path, headers={'Cache-Control': 'no-cache', 'User-Agent': 'OctetDeploymentCheck/0.2'})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def describe(path, status, headers, body):
    """Say what answered without logging cookies, tokens or a full HTML body."""
    text = body.decode('utf-8', errors='replace')
    title = re.search(r'<title[^>]*>(.*?)</title>', text, re.I | re.S)
    return {
        'path': path,
        'status': status,
        'type': headers.get('Content-Type'),
        'server': headers.get('Server'),
        'title': html.unescape(title.group(1)).strip()[:200] if title else None,
        'protectionMarkers': [m for m in ('imunify360', 'webshield', 'captcha', 'cloudflare') if m.encode() in body.lower()],
    }


def json_endpoint(path, expected_status):
    status, headers, body = request(path)
    if status != expected_status or 'application/json' not in headers.get('Content-Type', ''):
        print('Unexpected response:', describe(path, status, headers, body), flush=True)
        raise AssertionError(f'{path}: expected JSON HTTP {expected_status}, got {status}')
    return json.loads(body)


def verify():
    for path, marker in PAGES:
        status, _, body = request(path)
        assert status == 200 and marker in body.decode(), f'Page not ready: {path} (HTTP {status})'

    # A GET must reach the API script and be turned away by it, not by the host.
    assert json_endpoint('/boussole/audit.php', 405).get('error'), 'Expected a JSON error for GET'

    # The engine is loaded and its extensions are present on the deployed host.
    health = json_endpoint('/boussole/health.php', 200)
    assert health.get('curl') and health.get('dom'), f'Missing PHP extensions: {health}'
    assert health.get('ready'), f'Engine not ready: {health}'
    wanted = expected_version()
    assert health.get('engineVersion') == wanted, f"Deployed engine {health.get('engineVersion')}, expected {wanted}"
    return health


# O2Switch may keep serving stale files or 503s for a few minutes after FTPS sync.
for attempt in range(6):
    try:
        health = verify()
        break
    except (AssertionError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        if attempt == 5:
            raise
        print(f'Attempt {attempt + 1}/6 failed ({error}); retrying in 20 s.', flush=True)
        time.sleep(20)

# Printing the hosting's PHP version records it in every deploy log, so a change
# made in the hosting panel shows up here instead of as an unexplained failure.
print(f"Production verified: {len(PAGES)} pages, JSON API rejects GET, engine {health['engineVersion']} "
      f"ready on PHP {health.get('php', 'unknown')} (cURL and DOM present).")
