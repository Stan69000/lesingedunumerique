import { getCollection } from 'astro:content';

// Une seule règle pour la carte, les archives et les pages de détail.
export async function getPublishedBriefs() {
  const now = new Date();
  return (await getCollection('briefs', ({ data }) => !data.draft && data.pubDate <= now))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id));
}

export const formatBriefDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
}).format(date);
