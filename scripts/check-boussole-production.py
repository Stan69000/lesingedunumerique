"""Verify the deployed pages, JSON API and one real audit of our own site."""
import json
import re
import html
import time
import urllib.error
import urllib.request

BASE = 'https://lesingedunumerique.fr'


def request(path, payload=None):
    headers = {'Cache-Control': 'no-cache', 'User-Agent': 'OctetDeploymentCheck/0.1'}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=100) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


# O2Switch may briefly return 503 while the FTPS update becomes visible.
for attempt in range(6):
    try:
        for path, marker in [('/outils/', 'La Boussole'), ('/outils/boussole/', 'audit-form'), ('/lexique/', 'MCP'), ('/blog/votre-site-est-en-ligne-octet-sort-sa-boussole/', 'Octet sort sa boussole')]:
            status, _, body = request(path)
            assert status == 200 and marker in body.decode(), f'Page not ready: {path} (HTTP {status})'
        status, headers, body = request('/boussole/audit.php')
        assert status == 405 and 'application/json' in headers.get('Content-Type', ''), f'Expected JSON HTTP 405, got {status}'
        assert json.loads(body).get('error'), 'Expected a JSON error for GET'
        break
    except (AssertionError, urllib.error.URLError, TimeoutError):
        if attempt == 5:
            raise
        time.sleep(20)

status, headers, body = request('/boussole/audit.php', {'url': BASE + '/', 'goal': 'association'})
if status != 200:
    title = re.search(r'<title[^>]*>(.*?)</title>', body.decode('utf-8', errors='replace'), re.I | re.S)
    markers = [m for m in ['imunify360', 'webshield', 'captcha', 'cloudflare'] if m.encode() in body.lower()]
    print('Audit response diagnostic:', {'status': status, 'type': headers.get('Content-Type'), 'server': headers.get('Server'), 'title': html.unescape(title.group(1)).strip()[:200] if title else None, 'protectionMarkers': markers}, flush=True)
assert status == 200, f'Real audit failed: HTTP {status}; see safe response diagnostic above.'
assert 'application/json' in headers.get('Content-Type', ''), 'Expected JSON report'
report = json.loads(body)
assert len(report.get('checks', [])) == 11, 'Expected 11 checks'
assert report['url'].startswith(BASE), 'Unexpected target'
assert not report.get('demo'), 'Expected a real report'
assert next(c for c in report['checks'] if c['id'] == 'GEO-CITATIONS')['status'] == 'unmeasured'
print('Production verified: four pages, JSON API, real audit with 11 checks.')
