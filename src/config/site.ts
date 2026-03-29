export const siteSettings = {
  siteUrl: 'https://lesingedunumerique.fr',
  siteName: 'Le Singe Du Numérique',
  defaultDescription:
    "Association dédiée à l'inclusion numérique, aux ressources pratiques et à l'accompagnement des associations locales.",
  // Mode maintenance côté Astro.
  // Pour une coupure globale côté O2Switch/Apache, utiliser aussi public/.htaccess
  // et public/maintenance.html.
  maintenanceMode: false,
  maintenanceTitle: 'Site temporairement en maintenance',
  maintenanceMessage:
    "Le Singe Du Numérique revient très vite. Le site est momentanément indisponible pendant une intervention technique ou une mise à jour.",
} as const;
