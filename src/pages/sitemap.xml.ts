import { getCollection } from 'astro:content';
import { siteSettings } from '../config/site';
import { getPublishedBriefs } from '../lib/briefs';

export async function GET() {
  const posts = await getCollection('blog');
  const briefs = (await getPublishedBriefs()).filter((brief) => !brief.data.demo);
  const planches = (await getCollection('bd')).filter((planche) => !planche.data.draft);

  const staticPaths = [
    '/',
    '/asso/',
    '/projets/',
    '/adhesion/',
    '/contact/',
    '/blog/',
    '/bd/',
    '/veille/',
    '/veille/briefs/',
    '/veille/arnaques/',
    '/veille/failles/',
    '/veille/actu-generaliste/',
    '/veille/cyber/',
    '/veille/associations/',
    '/flux/',
    '/veille-sources/',
    '/plan-du-site/',
    '/accessibilite/',
    '/mentions-legales/',
  ];

  const urls = [
    ...staticPaths.map((path) => new URL(path, siteSettings.siteUrl).toString()),
    ...posts.map((post) => new URL(`/blog/${post.id}/`, siteSettings.siteUrl).toString()),
    ...planches.map((planche) => new URL(`/bd/${planche.id}/`, siteSettings.siteUrl).toString()),
    ...briefs.map((brief) => new URL(`/veille/briefs/${brief.id}/`, siteSettings.siteUrl).toString()),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
