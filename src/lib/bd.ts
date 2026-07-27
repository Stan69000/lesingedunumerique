import { getCollection, type CollectionEntry } from 'astro:content';

export type Planche = CollectionEntry<'bd'>;

/**
 * Code de la planche façon série : S01E03, ou S01HS02 pour un hors-série.
 * Les hors-séries ont leur propre numérotation, indépendante des épisodes.
 */
export function plancheCode(entry: Planche): string {
  const saison = `S${String(entry.data.saison).padStart(2, '0')}`;
  const numero = String(entry.data.numero).padStart(2, '0');
  return entry.data.horsSerie ? `${saison}HS${numero}` : `${saison}E${numero}`;
}

export function planchePath(entry: Planche): string {
  return `/bd/${entry.id}/`;
}

/**
 * Ordre de lecture : par saison, puis épisodes avant hors-séries, puis numéro.
 * Sert aussi bien à l'index qu'à la navigation précédent/suivant, pour que les
 * deux ne puissent pas diverger.
 */
export function compareLecture(a: Planche, b: Planche): number {
  if (a.data.saison !== b.data.saison) return a.data.saison - b.data.saison;
  if (a.data.horsSerie !== b.data.horsSerie) return a.data.horsSerie ? 1 : -1;
  return a.data.numero - b.data.numero;
}

/** Planches publiées, dans l'ordre de lecture. Les brouillons sont exclus. */
export async function getPlanches(): Promise<Planche[]> {
  const all = await getCollection('bd');
  return all.filter((entry) => !entry.data.draft).sort(compareLecture);
}

/** Regroupement par saison, pour l'affichage de l'index. */
export function parSaison(planches: Planche[]): { saison: number; planches: Planche[] }[] {
  const groupes = new Map<number, Planche[]>();
  for (const planche of planches) {
    const liste = groupes.get(planche.data.saison);
    if (liste) liste.push(planche);
    else groupes.set(planche.data.saison, [planche]);
  }
  return [...groupes.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([saison, liste]) => ({ saison, planches: liste }));
}
