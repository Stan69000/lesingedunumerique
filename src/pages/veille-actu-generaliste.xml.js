import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';
import { getVeilleData } from '../lib/veille';

export async function GET() {
  const veille = await getVeilleData();
  const items = veille.sections
    .filter((item) => item.key === 'cyber' || item.key === 'associations')
    .flatMap((item) => item.articles || [])
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const body = buildRssXml({
    title: 'Le Singe Du Numérique - Actualité générale',
    description: 'L’actualité de la cybersécurité et des associations.',
    siteUrl: siteSettings.siteUrl,
    path: '/veille-actu-generaliste.xml',
    items,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
