import catalogue from '../data/jeux.json';

/**
 * Un jeu de la bibliothèque de sensibilisation.
 *
 * Le catalogue (`src/data/jeux.json`) est généré par la super-admin à chaque
 * publication : ne pas l'éditer à la main, il serait écrasé au prochain sync.
 * Les jeux eux-mêmes sont hébergés par l'admin et embarqués en iframe
 * (`embedUrl`), ce qui suppose que l'origine correspondante figure dans
 * `frame-src` de la CSP (`public/.htaccess`).
 */
export type Jeu = {
  slug: string;
  name: string;
  description: string;
  intro: string;
  ageRange: string;
  tags: string[];
  bodyMd: string;
  embedUrl: string;
  cover: string | null;
  seoTitle: string;
  seoDescription: string;
  // Classement à listes fermées, réglé dans l'admin : ce sur quoi on filtre.
  audiences: string[];
  formats: string[];
  duration: string | null;
  themes: string[];
  /** Première mise en ligne, 'YYYY-MM-DD' (vide si le catalogue ne la fournit pas). */
  publishedAt: string;
};

export type Option = { key: string; label: string; hint?: string };

export type Facette = 'public' | 'format' | 'theme' | 'duree';

/**
 * Libellés des listes fermées. Le catalogue les transporte (l'admin fait
 * foi) ; cette copie ne sert que si un ancien catalogue n'en contient pas.
 */
const TAXONOMIE_PAR_DEFAUT: Record<'audiences' | 'formats' | 'durations' | 'themes', Option[]> = {
  audiences: [
    { key: 'enfants', label: 'Enfants', hint: 'moins de 12 ans' },
    { key: 'ados', label: 'Ados', hint: '12 à 17 ans' },
    { key: 'adultes', label: 'Adultes' },
    { key: 'parents', label: 'Parents', hint: 'pour accompagner un enfant' },
    { key: 'seniors', label: 'Seniors' },
  ],
  formats: [
    { key: 'solo', label: 'Seul', hint: 'sur un écran, à son rythme' },
    { key: 'groupe', label: 'En famille ou à plusieurs', hint: 'un écran pour plusieurs' },
    { key: 'atelier', label: 'En classe ou en atelier', hint: 'avec une personne qui anime' },
  ],
  durations: [
    { key: 'court', label: 'Moins de 10 min' },
    { key: 'moyen', label: '10 à 30 min' },
    { key: 'long', label: 'Plus de 30 min' },
  ],
  themes: [
    { key: 'arnaques', label: 'Arnaques' },
    { key: 'comptes', label: 'Mots de passe et comptes' },
    { key: 'vie-privee', label: 'Vie privée et données' },
    { key: 'reseaux', label: 'Réseaux sociaux et harcèlement' },
    { key: 'desinfo', label: 'Désinformation et IA' },
    { key: 'internet', label: 'Comprendre Internet' },
    { key: 'structures', label: 'Cybersécurité des structures' },
  ],
};

type CatalogueBrut = {
  taxonomy?: Partial<typeof TAXONOMIE_PAR_DEFAUT>;
  games: Array<Partial<Jeu> & Pick<Jeu, 'slug' | 'name' | 'embedUrl'>>;
};

const brut = catalogue as unknown as CatalogueBrut;

export const taxonomie = {
  audiences: brut.taxonomy?.audiences ?? TAXONOMIE_PAR_DEFAUT.audiences,
  formats: brut.taxonomy?.formats ?? TAXONOMIE_PAR_DEFAUT.formats,
  durations: brut.taxonomy?.durations ?? TAXONOMIE_PAR_DEFAUT.durations,
  themes: brut.taxonomy?.themes ?? TAXONOMIE_PAR_DEFAUT.themes,
};

const liste = (valeur: unknown): string[] =>
  Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === 'string') : [];

/** Complète une fiche : un catalogue plus ancien n'a pas les champs de classement. */
function normaliser(jeu: CatalogueBrut['games'][number]): Jeu {
  return {
    description: '',
    intro: '',
    ageRange: '',
    bodyMd: '',
    cover: null,
    seoTitle: '',
    seoDescription: '',
    ...jeu,
    tags: liste(jeu.tags),
    audiences: liste(jeu.audiences),
    formats: liste(jeu.formats),
    duration: typeof jeu.duration === 'string' ? jeu.duration : null,
    themes: liste(jeu.themes),
    publishedAt: typeof jeu.publishedAt === 'string' ? jeu.publishedAt : '',
  };
}

export const jeux: Jeu[] = brut.games.map(normaliser);

export function jeuPath(slug: string): string {
  return `/sensibilisation/jeux/${slug}/`;
}

/** Titre de page : le champ SEO s'il est renseigné, sinon un gabarit par défaut. */
export function jeuTitle(jeu: Jeu): string {
  if (jeu.seoTitle) return jeu.seoTitle;
  return `${jeu.name} : jeu de sensibilisation numérique | Le Singe Du Numérique`;
}

export function jeuDescription(jeu: Jeu): string {
  return (
    jeu.seoDescription ||
    jeu.description ||
    `${jeu.name}, jeu pédagogique gratuit de sensibilisation au numérique et à la cybersécurité.`
  );
}

// --- Classement -------------------------------------------------------------

const CHAMP: Record<Facette, { cle: 'audiences' | 'formats' | 'themes' | 'duration'; options: Option[] }> = {
  public: { cle: 'audiences', options: taxonomie.audiences },
  format: { cle: 'formats', options: taxonomie.formats },
  theme: { cle: 'themes', options: taxonomie.themes },
  duree: { cle: 'duration', options: taxonomie.durations },
};

/** Valeurs d'une fiche pour une facette (la durée est unique). */
export function valeurs(jeu: Jeu, facette: Facette): string[] {
  const v = jeu[CHAMP[facette].cle];
  return Array.isArray(v) ? v : v ? [v] : [];
}

/** Libellés d'une fiche pour une facette, dans l'ordre de la liste de référence. */
export function libelles(jeu: Jeu, facette: Facette): string[] {
  const pris = new Set(valeurs(jeu, facette));
  return CHAMP[facette].options.filter((o) => pris.has(o.key)).map((o) => o.label);
}

/** « Adultes, seniors » : une liste de libellés lue comme une phrase. */
export function enPhrase(libelles: string[]): string {
  return libelles.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1))).join(', ');
}

export function libelle(facette: Facette, cle: string): string {
  return CHAMP[facette].options.find((o) => o.key === cle)?.label ?? cle;
}

/** Options d'une facette effectivement portées par au moins un jeu, avec leur compte. */
export function optionsUtilisees(facette: Facette, parmi: Jeu[] = jeux): Array<Option & { jeux: number }> {
  return CHAMP[facette].options
    .map((o) => ({ ...o, jeux: parmi.filter((j) => valeurs(j, facette).includes(o.key)).length }))
    .filter((o) => o.jeux > 0);
}

/**
 * Une facette n'est proposée que si elle trie vraiment : au moins deux
 * options utilisées, et la moitié des jeux classés (sinon filtrer masquerait
 * des jeux simplement pas encore renseignés dans l'admin).
 */
export function facetteUtile(facette: Facette, parmi: Jeu[] = jeux): boolean {
  const classes = parmi.filter((j) => valeurs(j, facette).length > 0).length;
  return optionsUtilisees(facette, parmi).length >= 2 && classes >= parmi.length / 2;
}

/** Thèmes abordés : les thèmes classés s'il y en a, sinon les tags libres. */
export function nombreDeThemes(parmi: Jeu[] = jeux): number {
  const classes = optionsUtilisees('theme', parmi).length;
  if (classes > 0) return classes;
  return new Set(parmi.flatMap((j) => j.tags.map((t) => t.toLowerCase()))).size;
}

/** Lien vers le catalogue déjà filtré. */
export function lienCatalogue(facette: Facette, cle: string): string {
  return `/sensibilisation/jeux/?${facette}=${encodeURIComponent(cle)}`;
}

// --- Mises en avant --------------------------------------------------------

/** Les jeux mis en avant, dans l'ordre du catalogue. */
export function jeuxALaUne(limite = 3): Jeu[] {
  return jeux.slice(0, limite);
}

/** Fenêtre au-delà de laquelle un jeu n'est plus une nouveauté. */
export const JOURS_NOUVEAUTE = 60;

/**
 * Jeux mis en ligne depuis moins de `JOURS_NOUVEAUTE` jours, du plus récent
 * au plus ancien. Le site est reconstruit à chaque publication, la date de
 * build suffit comme « aujourd'hui ».
 */
export function nouveautes(limite = 3, aujourdhui = new Date()): Jeu[] {
  const seuil = new Date(aujourdhui.getTime() - JOURS_NOUVEAUTE * 86_400_000).toISOString().slice(0, 10);
  return jeux
    .map((jeu, ordre) => ({ jeu, ordre }))
    .filter(({ jeu }) => jeu.publishedAt && jeu.publishedAt >= seuil)
    .sort((a, b) => b.jeu.publishedAt.localeCompare(a.jeu.publishedAt) || a.ordre - b.ordre)
    .slice(0, limite)
    .map(({ jeu }) => jeu);
}

/** Origines à autoriser en `frame-src` — utilisé par le contrôle CSP. */
export function embedOrigins(): string[] {
  const origins = new Set<string>();
  for (const jeu of jeux) {
    try {
      origins.add(new URL(jeu.embedUrl).origin);
    } catch {
      // URL relative (jeu servi par le site lui-même) : rien à autoriser.
    }
  }
  return [...origins].sort();
}
