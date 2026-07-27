import { getCollection } from 'astro:content';
import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';

export async function GET() {
  const planches = await getCollection('bd');
  const sorted = planches
    .filter((planche) => !planche.data.draft)
    .sort((a, b) => new Date(b.data.pubDate || 0).getTime() - new Date(a.data.pubDate || 0).getTime());

  const items = sorted.map((planche) => ({
    id: planche.id,
    title: planche.data.title,
    url: new URL(`/bd/${planche.id}/`, siteSettings.siteUrl).toString(),
    publishedAt: planche.data.pubDate || new Date().toISOString(),
    source: siteSettings.siteName,
  }));

  const body = buildRssXml({
    title: 'Le Singe Du Numerique - Les BD d’Octet',
    description: 'Une planche de BD par semaine pour comprendre le numerique.',
    siteUrl: siteSettings.siteUrl,
    path: '/bd.xml',
    items,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
