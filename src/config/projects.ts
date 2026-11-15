/** Projets portés par l’association ; liens partagés par les pages et les pieds de page. */
export const associationProjects = [
  {
    id: 'boussole', name: 'La Boussole d’Octet', icon: '🧭',
    href: '/outils/boussole/',
    promise: 'Comprendre comment améliorer la visibilité de son site',
    description: 'Un premier bilan SEO et GEO gratuit : analysez une page ou explorez un échantillon de votre site et découvrez quoi améliorer, pourquoi et par où commencer.',
    note: 'Deux modes : une page précise ou jusqu’à 5 pages reliées, avec des pistes expliquées et un rapport à partager.',
    cta: 'Analyser mon site',
  },
  {
    id: 'signal-clair', name: 'Le Signal Clair', icon: '📡',
    href: 'https://lesignalclair.fr/',
    promise: 'Comprendre ce qui se passe aujourd’hui',
    description: 'Actualités tech, cybersécurité et arnaques regroupées par sujet, avec les liens vers les sources pour approfondir.',
    note: 'Une veille automatisée pour explorer l’actualité numérique.',
    cta: 'Explorer l’actualité',
  },
  {
    id: 'rgaa-audit', name: 'RGAA Audit', icon: '♿',
    href: 'https://stan69000.github.io/rgaa-audit/',
    promise: 'Rendre son site plus accessible',
    description: 'Un outil gratuit et open source de pré-audit pour repérer les premiers problèmes d’accessibilité et comprendre où agir.',
    note: 'Un point de départ pour progresser, à compléter par des vérifications humaines.',
    cta: 'Découvrir l’outil',
  },
  {
    id: 'astro-a11y', name: 'astro-a11y', icon: '🛠️',
    href: 'https://stan69000.github.io/astro-a11y/',
    promise: 'Vérifier l’accessibilité d’un site Astro à chaque mise à jour',
    description: 'Un outil gratuit et open source pour les développeurs. Il analyse les pages d’un site Astro, signale les problèmes d’accessibilité, les relie aux critères du RGAA et explique comment les corriger.',
    note: 'S’ajoute au projet ou se lance en ligne de commande. Comme tout outil automatique, il ne remplace pas une vérification humaine.',
    cta: 'Découvrir l’outil',
  },
] as const;
