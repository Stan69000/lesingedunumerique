import { getCollection } from 'astro:content';
import { siteSettings } from '../config/site';

export async function GET() {
  const posts = await getCollection('blog');

  const staticPaths = [
    '/',
    '/asso',
    '/projets',
    '/evenements',
    '/adhesion',
    '/contact',
    '/blog',
    '/veille',
    '/veille/arnaques',
    '/veille/failles',
    '/veille/actu-generaliste',
    '/veille/cyber',
    '/veille/associations',
    '/flux',
    '/veille-sources',
    '/plan-du-site',
    '/accessibilite',
    '/mentions-legales',
  ];

  const urls = [
    ...staticPaths.map((path) => new URL(path, siteSettings.siteUrl).toString()),
    ...posts.map((post) => new URL(`/blog/${post.id}/`, siteSettings.siteUrl).toString()),
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
