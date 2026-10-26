/** Projets portés par l’association ; liens partagés par les pages et les pieds de page. */
export const associationProjects = [
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
] as const;
