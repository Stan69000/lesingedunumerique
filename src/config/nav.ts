export interface NavItem {
  href: string;
  label: string;
  matchPrefix?: boolean;
}

export const mainNav: NavItem[] = [
  { href: '/blog', label: 'Articles et guides', matchPrefix: true },
  { href: '/bd', label: 'BD', matchPrefix: true },
  { href: '/veille', label: 'Alertes arnaques', matchPrefix: true },
  { href: '/sensibilisation', label: 'Jeux', matchPrefix: true },
  { href: '/lexique', label: 'Lexique' },
  { href: '/outils', label: 'Nos outils', matchPrefix: true },
  { href: '/asso', label: 'L’association' },
  { href: '/contact', label: 'Contact' },
];

export const navCta: NavItem = { href: '/adhesion', label: 'Rejoindre' };

export const footerNav: NavItem[] = [
  ...mainNav,
  navCta,
  { href: '/outils/boussole/', label: 'La Boussole d’Octet' },
  { href: '/flux', label: 'Flux RSS' },
  { href: '/plan-du-site', label: 'Plan du site' },
  { href: '/mentions-legales', label: 'Mentions légales' },
];

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

export const ariaCurrent = (item: NavItem, currentPath: string): 'page' | undefined => {
  const path = normalize(currentPath);
  const isCurrent = item.matchPrefix
    ? path === item.href || path.startsWith(`${item.href}/`)
    : path === item.href;
  return isCurrent ? 'page' : undefined;
};
