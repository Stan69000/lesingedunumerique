import { getCollection } from 'astro:content';
import { siteSettings } from '../config/site';
import { buildRssXml } from '../lib/rss';

export async function GET() {
  const posts = await getCollection('blog');
  const sorted = [...posts].sort((a, b) => {
    const first = new Date(b.data.pubDate || 0).getTime();
    const second = new Date(a.data.pubDate || 0).getTime();
    return first - second;
  });

  const items = sorted.map((post) => ({
    id: post.id,
    title: post.data.title,
    url: new URL(`/blog/${post.id}/`, siteSettings.siteUrl).toString(),
    publishedAt: post.data.pubDate || new Date().toISOString(),
    source: siteSettings.siteName,
  }));

  const body = buildRssXml({
    title: 'Le Singe Du Numerique - Blog',
    description: 'Derniers articles du blog.',
    siteUrl: siteSettings.siteUrl,
    path: '/blog.xml',
    items,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
