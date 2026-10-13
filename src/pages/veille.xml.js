import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const body = buildRssXml({
    title: 'Le Singe Du Numérique - Toutes les alertes',
    description: 'Toutes les alertes : arnaques, fuites de données, cybersécurité et associations.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille.xml',
    items: veille.allArticles,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
