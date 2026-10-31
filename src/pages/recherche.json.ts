import { getCollection } from 'astro:content';
import { mainNav, footerNav } from '../config/nav';
import { lexique } from '../lib/lexique';
import { jeux } from '../lib/jeux';
import { getPublishedBriefs } from '../lib/briefs';
export async function GET() {
  const entries: { title: string; description: string; type: string; href: string; keywords: string }[] = [];
  for (const collection of ['blog', 'bd'] as const) {
    for (const post of await getCollection(collection, ({ data }) => !data.draft)) {
      entries.push({ title: post.data.title, description: post.data.description, type: collection === 'blog' ? 'Articles' : 'BD', href: `/${collection}/${post.id}/`, keywords: `${post.data.tags.join(' ')} ${post.body ?? ''}` });
    }
  }
  for (const brief of (await getPublishedBriefs()).filter(brief => !brief.data.demo)) {
    entries.push({ title: brief.data.title, description: brief.data.description, type: 'Alertes', href: `/veille/briefs/${brief.id}/`, keywords: brief.data.scams.map(s => s.name).join(' ') });
  }
  for (const item of lexique) entries.push({ title: item.terme, description: item.definition, type: 'Lexique', href: `/lexique#${item.terme.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, keywords: `${item.aussi?.join(' ') ?? ''} ${'recherches' in item ? item.recherches?.join(' ') ?? '' : ''} ${item.situation} ${item.reflexe} ${item.theme}` });
  for (const game of jeux) entries.push({ title: game.name, description: game.description, type: 'Jeux', href: `/sensibilisation/jeux/${game.slug}/`, keywords: `${game.tags.join(' ')} ${game.ageRange} ${game.bodyMd}` });
  for (const item of [{ href: '/', label: 'Accueil' }, ...footerNav]) entries.push({ title: item.label, description: 'Explorer le site', type: 'Rubriques', href: item.href, keywords: mainNav.some(n => n.href === item.href) ? 'navigation' : '' });
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
