import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const section = veille.sections.find((item) => item.key === 'arnaques');

  const body = buildRssXml({
    title: 'Le Singe Du Numérique - Dernières arnaques',
    description: 'Les dernières arnaques et campagnes frauduleuses repérées.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille-arnaques.xml',
    items: section?.articles || [],
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
