import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const section = veille.sections.find((item) => item.key === 'cyber');

  const body = buildRssXml({
    title: 'Le Singe Du Numerique - Actu cyber',
    description: 'Flux de veille des actualites cyber.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille-cyber.xml',
    items: section?.articles || [],
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
