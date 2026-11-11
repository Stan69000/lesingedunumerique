import { getCollection, type CollectionEntry } from 'astro:content';

export type Fiche = CollectionEntry<'atelier'>;
export type EtagereId = NonNullable<Fiche['data']['etagere']>;

/**
 * Les étagères de l'atelier. Une étagère n'apparaît qu'avec au moins une
 * recette publiée : on n'annonce pas de recettes qui n'existent pas encore.
 */
export const etageres: { id: EtagereId; nom: string; icone: string; description: string }[] = [
  {
    id: 'adherents', nom: 'Adhérents', icone: '🧑‍🤝‍🧑',
    description: 'Accueillir les nouveaux, suivre les cotisations, garder un fichier à jour.',
  },
  {
    id: 'evenements', nom: 'Événements et bénévoles', icone: '📅',
    description: 'Planifier, inscrire les bénévoles, prévenir la veille.',
  },
  {
    id: 'communication', nom: 'Communication', icone: '✉️',
    description: 'Écrire à chacun personnellement, sans copier-coller.',
  },
  {
    id: 'tresorerie', nom: 'Trésorerie et vie statutaire', icone: '🧾',
    description: 'Notes de frais, assemblée générale, reçus : moins de paperasse.',
  },
  {
    id: 'securite', nom: 'Sécurité et entretien', icone: '🔒',
    description: 'Sauvegarder, vérifier les partages, ne garder que le nécessaire.',
  },
];

export const etagere = (id: EtagereId | undefined) => etageres.find((e) => e.id === id);

/** Les fiches visibles : publiées en production, brouillons compris en développement. */
export async function getFiches(): Promise<Fiche[]> {
  const fiches = await getCollection('atelier', ({ data }) => !data.draft || import.meta.env.DEV);
  return fiches.sort((a, b) => (a.data.ordre ?? 99) - (b.data.ordre ?? 99) || a.data.niveau - b.data.niveau || a.data.title.localeCompare(b.data.title, 'fr'));
}

/** Fiches publiées seulement : pour le sitemap, la recherche et les liens d'entrée. */
export async function getFichesPubliees(): Promise<Fiche[]> {
  return (await getCollection('atelier', ({ data }) => !data.draft));
}

/** Où en est la fiche dans son cycle de publication (voir content.config.ts). */
export function statutFiche(fiche: Fiche): { label: string; detail?: string } | null {
  const { draft, verifieLe, publierLe } = fiche.data;
  if (!draft) return null;
  const date = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  if (publierLe) return { label: 'Programmée', detail: `le ${date(publierLe)}` };
  if (verifieLe) return { label: 'Vérifiée', detail: 'pas encore programmée' };
  return { label: 'Brouillon' };
}

export const fichePath = (fiche: Fiche) => `/outils/atelier/${fiche.id}/`;

export const niveauLabel = (niveau: number) => ['', 'Débutant', 'Intermédiaire', 'Avancé'][niveau] ?? '';

export const donneesInfo = {
  aucune: { label: 'Aucune donnée personnelle', icone: '🟢', regle: 'Ce script ne lit aucune information sur des personnes.' },
  contacts: { label: 'Coordonnées de personnes', icone: '🟠', regle: 'Noms et adresses e-mail sont des données personnelles : ne gardez que les colonnes utiles, limitez l’accès au tableau au bureau, et supprimez les lignes des personnes parties.' },
  sensibles: { label: 'Données sensibles', icone: '🔴', regle: 'Santé, coordonnées bancaires, situation sociale : ces données demandent une protection renforcée. Demandez-vous d’abord si vous en avez vraiment besoin.' },
} as const;

/** Les scripts `.gs`, lus en texte brut au moment du build. */
const scripts = import.meta.glob('../content/atelier/*.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const scriptFor = (fiche: Fiche): string | undefined => scripts[`../content/atelier/${fiche.id}.gs`];

/** Le texte de la fiche, coupé en deux autour du marqueur du script. */
export const MARQUEUR_SCRIPT = '<!-- script -->';
export const splitBody = (body: string): [string, string] => {
  const [avant, ...apres] = body.split(MARQUEUR_SCRIPT);
  return [avant, apres.join('')];
};
