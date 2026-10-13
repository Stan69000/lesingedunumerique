import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const section = veille.sections.find((item) => item.key === 'failles');

  const body = buildRssXml({
    title: 'Le Singe Du Numérique - Dernières fuites de données',
    description: 'Les dernières fuites de données signalées.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille-failles.xml',
    items: section?.articles || [],
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
