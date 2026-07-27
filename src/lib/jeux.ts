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
};

export const jeux: Jeu[] = catalogue.games as Jeu[];

export function jeuPath(slug: string): string {
  return `/sensibilisation/jeux/${slug}`;
}

/** Titre de page : le champ SEO s'il est renseigné, sinon un gabarit par défaut. */
export function jeuTitle(jeu: Jeu): string {
  if (jeu.seoTitle) return jeu.seoTitle;
  return `${jeu.name} : jeu de sensibilisation numérique | Le Singe Du Numerique`;
}

export function jeuDescription(jeu: Jeu): string {
  return (
    jeu.seoDescription ||
    jeu.description ||
    `${jeu.name}, jeu pédagogique gratuit de sensibilisation au numérique et à la cybersécurité.`
  );
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
