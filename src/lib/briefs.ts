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

const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
}).formatToParts(date).map(({ type, value }) => [type, value]));

const dayLabel = (day: string) => (day === '1' ? '1er' : day);

/** « Du 1er au 7 novembre 2026 », ou « Du 25 octobre au 1er novembre 2026 ». */
export function formatBriefPeriod(start: Date, end: Date) {
  const a = parts(start), b = parts(end);
  const from = a.year !== b.year ? `${dayLabel(a.day)} ${a.month} ${a.year}`
    : a.month !== b.month ? `${dayLabel(a.day)} ${a.month}` : dayLabel(a.day);
  return `Du ${from} au ${dayLabel(b.day)} ${b.month} ${b.year}`;
}

/** « dimanche 8 novembre 2026 » */
export function formatBriefDay(date: Date) {
  const p = parts(date);
  return `${p.weekday} ${dayLabel(p.day)} ${p.month} ${p.year}`;
}

/** « 8 novembre », pour les rappels d'une édition à l'autre. */
export const formatBriefShortDate = (date: Date) => {
  const p = parts(date);
  return `${dayLabel(p.day)} ${p.month}`;
};
