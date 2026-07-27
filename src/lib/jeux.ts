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

/** Les jeux mis en avant sur /sensibilisation, dans l'ordre du catalogue. */
export function jeuxALaUne(limite = 3): Jeu[] {
  return jeux.slice(0, limite);
}

/** Thèmes distincts du catalogue, triés pour un affichage stable. */
export function themesCouverts(): string[] {
  const themes = new Map<string, string>();
  for (const jeu of jeux) {
    for (const tag of jeu.tags) {
      const cle = tag.toLowerCase();
      if (!themes.has(cle)) themes.set(cle, tag);
    }
  }
  return [...themes.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Le filtre par thème n'est proposé que s'il aide vraiment.
 *
 * Les fiches du catalogue arrivent de la super-admin avec des tags souvent
 * vides : filtrer alors masquerait la majorité des jeux sans que le visiteur
 * comprenne pourquoi. La barre apparaît d'elle-même quand assez de fiches
 * sont renseignées.
 */
export function filtreThemesPertinent(): boolean {
  const jeuxTagues = jeux.filter((jeu) => jeu.tags.length > 0).length;
  return jeuxTagues >= 4 && jeuxTagues >= jeux.length / 2 && themesCouverts().length >= 3;
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
