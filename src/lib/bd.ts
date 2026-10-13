import { getCollection, type CollectionEntry } from 'astro:content';

export type Planche = CollectionEntry<'bd'>;

/**
 * Libellé lisible de la planche : « Épisode 3 », ou « Hors-série 2 ».
 * Les hors-séries ont leur propre numérotation, indépendante des épisodes.
 * `avecSaison` préfixe la saison, là où le contexte ne la donne pas déjà.
 */
export function plancheCode(entry: Planche, avecSaison = false): string {
  const libelle = entry.data.horsSerie ? `Hors-série ${entry.data.numero}` : `Épisode ${entry.data.numero}`;
  return avecSaison ? `Saison ${entry.data.saison} · ${libelle}` : libelle;
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
