import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const section = veille.sections.find((item) => item.key === 'associations');

  const body = buildRssXml({
    title: 'Le Singe Du Numérique - Actualité des associations',
    description: 'L’actualité utile aux associations.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille-associations.xml',
    items: section?.articles || [],
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
