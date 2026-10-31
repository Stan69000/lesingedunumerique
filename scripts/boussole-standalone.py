"""Package the built demonstration into an offline, single-file HTML preview."""
from pathlib import Path
import base64
import re
import sys

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
is_lexique = '--lexique' in sys.argv
html = (dist / ('lexique/index.html' if is_lexique else 'outils/boussole/index.html')).read_text()
client = None

def script(match):
    global client
    tag = match.group(0)
    src = re.search(r'src="(/_astro/boussole\.[^"]+\.js)"', tag)
    lexique_src = re.search(r'src="(/_astro/LexiqueExplorer\.[^"]+\.js)"', tag)
    if is_lexique and lexique_src:
        client = (dist / lexique_src[1].lstrip('/')).read_text()
    if is_lexique and 'lexique-search' in tag and 'src=' not in tag:
        client = re.sub(r'^<script[^>]*>|</script>$', '', tag)
    if src and not is_lexique:
        client = (dist / src[1].lstrip('/')).read_text()
    return ''

html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', script, html)
assert client is not None, 'Build the Astro page first.'
assert not re.search(r'\bimport\s', client), 'Client must be self-contained.'

def css(match):
    tag = match.group(0)
    href = re.search(r'href="(/_astro/[^"]+\.css)"', tag)
    return '<style>' + (dist / href[1].lstrip('/')).read_text() + '</style>' if href else ''

html = re.sub(r'<link\b[^>]*>', css, html)
html = re.sub(r'<html\b', '<html data-standalone-demo="true"', html, count=1)
html = html.replace('content="index,follow"', 'content="noindex,nofollow"')
html = re.sub(r'<header\b[^>]*>[\s\S]*?</header>', '', html)
html = re.sub(r'<footer\b[^>]*>[\s\S]*?</footer>', '', html)
logo = base64.b64encode((root / 'public/logo.svg').read_bytes()).decode()
html = html.replace('src="/logo.svg"', f'src="data:image/svg+xml;base64,{logo}"')
html = html.replace('href="/', 'href="https://lesingedunumerique.fr/')
html = html.replace('href="https://lesingedunumerique.fr/lexique-seo/"', 'href="lexique-demo.html?univers=seo"')
html = html.replace('href="https://lesingedunumerique.fr/lexique/', 'href="lexique-demo.html')
html = html.replace('href="https://lesingedunumerique.fr/outils/boussole/"', 'href="boussole-demo.html"')
html = html.replace('<title>', '<title>Démo locale — ')
html = html.replace('id="audit-submit">Explorer cette page', 'id="audit-submit">Rejouer la simulation')
html = html.replace('id="audit-url"', 'value="https://ateliers-du-lien.example/" readonly id="audit-url"')
html = html.replace('La page est récupérée par notre serveur, sans connexion à votre compte. Ne saisissez pas de lien privé. Aucun rapport n’est enregistré par l’outil. Une empreinte temporaire de l’adresse IP limite les abus ; les journaux techniques de l’hébergeur restent applicables.', 'Démonstration autonome : aucun site analysé, aucune donnée envoyée. Les boutons permettent de parcourir un exemple fictif et d’exporter ses résultats.')
html = html.replace('Collez une adresse. Octet vous aide à comprendre ce qui peut être amélioré, pourquoi et par où commencer.', 'Découvrez l’expérience avec une association fictive : comprenez les constats, explorez les corrections et repartez avec votre rapport d’exemple.')
html = html.replace('Une page à la fois · Sans compte · Sans clé IA · Adresses sans paramètres après « ? »', 'Adresse fictive de démonstration · Fonctionne sans connexion · Aucun audit réel')
html = re.sub(r'(<body\b[^>]*>)', r'\1<div class="offline-banner">🐒 DÉMONSTRATION LOCALE — données fictives · aucun audit réel</div>', html, count=1)
html = html.replace('</head>', '<style>.offline-banner{padding:14px 24px;background:#fed7aa;color:#431407;font:700 14px system-ui;text-align:center}input,select,button{font-family:inherit}body{font-family:system-ui,sans-serif!important}.hero-section{padding-top:45px!important}#main-content{padding-top:0!important}@media print{.offline-banner{display:block!important}}</style></head>')
if is_lexique:
    html = html.replace('🐒 DÉMONSTRATION LOCALE — données fictives · aucun audit réel', '🐒 APERÇU LOCAL — Le lexique d’Octet · Numérique, SEO/GEO, RGAA, arnaques et jargon IA')
    html = html.replace('Démo locale — ', 'Aperçu local — ')
html = html.replace('</body>', '<script>' + client.replace('</script', '<\\/script') + '</script></body>')
target = root / ('previews/lexique-demo.html' if is_lexique else 'previews/boussole-demo.html')
target.parent.mkdir(exist_ok=True)
target.write_text(html)
if is_lexique:
    (root / 'previews/lexique-seo-demo.html').write_text(html)
print(f'{target} ({target.stat().st_size} bytes)')
