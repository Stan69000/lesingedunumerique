import { getCollection, type CollectionEntry } from 'astro:content';

export type Jeu = CollectionEntry<'jeux'>;

export const PUBLICS = ['Enfants', 'Ados', 'Adultes'] as const;

export function urlJeu(jeu: Jeu) {
  return `/sensibilisation/jeux/${jeu.id}/`;
}

/** Jeux disponibles d'abord, puis ceux à venir, chaque groupe trié par `ordre`. */
export async function getJeux(): Promise<Jeu[]> {
  const jeux = await getCollection('jeux');
  return jeux.sort((a, b) => {
    const rang = Number(a.data.statut === 'bientot') - Number(b.data.statut === 'bientot');
    return rang !== 0 ? rang : a.data.ordre - b.data.ordre;
  });
}

export function jeuxDisponibles(jeux: Jeu[]) {
  return jeux.filter((jeu) => jeu.data.statut === 'disponible');
}

export function jeuxALaUne(jeux: Jeu[], limite = 3) {
  const misEnAvant = jeux.filter((jeu) => jeu.data.aLaUne);
  return (misEnAvant.length > 0 ? misEnAvant : jeux).slice(0, limite);
}

export function publicsCouverts(jeux: Jeu[]) {
  return PUBLICS.filter((cible) => jeux.some((jeu) => jeu.data.publics.includes(cible)));
}

export function themesCouverts(jeux: Jeu[]) {
  return [...new Set(jeux.flatMap((jeu) => jeu.data.themes))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Valeur d'attribut `data-*` utilisée par les filtres du catalogue. */
export function facette(valeurs: readonly string[]) {
  return valeurs.map((valeur) => valeur.toLowerCase()).join('|');
}
