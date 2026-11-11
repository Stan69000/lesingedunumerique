import { getCollection } from 'astro:content';
import { siteSettings } from '../config/site';
import { getPublishedBriefs } from '../lib/briefs';
import { jeux, jeuPath } from '../lib/jeux';
import { getFichesPubliees, fichePath } from '../lib/atelier';

export async function GET() {
  const posts = await getCollection('blog');
  const briefs = (await getPublishedBriefs()).filter((brief) => !brief.data.demo);
  const planches = (await getCollection('bd')).filter((planche) => !planche.data.draft);
  const fiches = await getFichesPubliees();

  const staticPaths = [
    '/',
    '/asso/',
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
    '/sensibilisation/',
    '/sensibilisation/jeux/',
    '/flux/',
    '/lexique/',
    '/outils/',
    '/outils/boussole/',
    // L'atelier n'entre dans le sitemap qu'avec sa première fiche publiée.
    ...(fiches.length ? ['/outils/atelier/'] : []),
    '/veille-sources/',
    '/plan-du-site/',
    '/accessibilite/',
    '/mentions-legales/',
  ];

  const urls = [
    ...staticPaths.map((path) => new URL(path, siteSettings.siteUrl).toString()),
    ...posts.map((post) => new URL(`/blog/${post.id}/`, siteSettings.siteUrl).toString()),
    ...planches.map((planche) => new URL(`/bd/${planche.id}/`, siteSettings.siteUrl).toString()),
    ...jeux.map((jeu) => new URL(jeuPath(jeu.slug), siteSettings.siteUrl).toString()),
    ...fiches.map((fiche) => new URL(fichePath(fiche), siteSettings.siteUrl).toString()),
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
