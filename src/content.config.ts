import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    rubrique: z.enum(['Articles', 'Veille', 'Technos']),
    tags: z.array(z.string()),
    author: z.string().optional(),
    draft: z.boolean().optional().default(false),
    featured: z.boolean().optional().default(false),
    // Champs SEO optionnels, renseignés depuis l'admin.
    seoTitle: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
  }).refine((post) => !post.image || Boolean(post.imageAlt?.trim()), {
    message: 'Une image de partage doit avoir un texte alternatif.', path: ['imageAlt'],
  }),
});

// Les planches BD d'Octet. Le corps Markdown porte la transcription textuelle
// de la planche : c'est le seul contenu lisible par un lecteur d'écran ou un
// moteur de recherche, une image seule n'en offrant aucun.
const bd = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bd' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    saison: z.number().int().min(1).default(1),
    numero: z.number().int().min(1),
    horsSerie: z.boolean().default(false),
    planche: z.string(),
    plancheAlt: z.string(),
    // Dimensions de la planche : évitent le décalage de mise en page au
    // chargement. Optionnelles pour tolérer une planche ajoutée à la main.
    plancheWidth: z.number().int().positive().optional(),
    plancheHeight: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const briefs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/briefs' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    type: z.enum(['weekly', 'monthly', 'evergreen']).default('weekly'),
    draft: z.boolean().default(true),
    demo: z.boolean().default(false),
    scams: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1) })).min(1),
    sources: z.array(z.object({ title: z.string().min(1), url: z.string().url().startsWith('https://') })).min(1),
  }).refine((brief) => brief.periodStart <= brief.periodEnd, {
    message: 'La fin de période doit suivre son début.', path: ['periodEnd'],
  }),
});

// L'atelier d'Octet : automatisations Google Apps Script pour les associations.
// Une fiche est soit un tuto « Premiers pas », soit une recette rangée sur une
// étagère. Le script d'une recette vit à côté, dans `<slug>.gs`, et s'insère
// dans le texte à l'emplacement du marqueur `<!-- script -->`.
// Règle éditoriale : rien n'est publié sans avoir été vérifié par un humain
// (script testé sur un vrai compte, texte relu) ; `verifieLe` en garde la trace.
// Cycle piloté depuis l'admin (Admin-Sites-Astro, module Atelier) :
// brouillon → vérifiée (`verifieLe`) → programmée (`publierLe`) → publiée
// (`draft: false`, `pubDate` = jour de publication).
const atelier = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/atelier' }),
  schema: z.object({
    kind: z.enum(['premiers-pas', 'recette']),
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    verifieLe: z.coerce.date().optional(),
    publierLe: z.coerce.date().optional(),
    // Empreinte du script vérifié : l'admin bloque la publication s'il a changé depuis.
    empreinteScript: z.string().optional(),
    draft: z.boolean().default(true),
    ordre: z.number().int().min(1).optional(),
    etagere: z.enum(['adherents', 'evenements', 'communication', 'tresorerie', 'securite']).optional(),
    niveau: z.number().int().min(1).max(3).default(1),
    duree: z.string().optional(),
    services: z.array(z.enum(['Sheets', 'Forms', 'Gmail', 'Agenda', 'Drive', 'Docs'])).default([]),
    declencheur: z.string().optional(),
    compteGratuit: z.string().optional(),
    donnees: z.enum(['aucune', 'contacts', 'sensibles']).optional(),
    autorisations: z.array(z.object({ droit: z.string().min(1), pourquoi: z.string().min(1) })).default([]),
    sources: z.array(z.object({ title: z.string().min(1), url: z.string().url().startsWith('https://') })).default([]),
  }).refine((fiche) => fiche.draft || Boolean(fiche.verifieLe), {
    message: 'Une fiche publiée doit avoir été vérifiée par un humain (verifieLe).', path: ['verifieLe'],
  }).refine((fiche) => !fiche.publierLe || (fiche.draft && Boolean(fiche.verifieLe)), {
    message: 'Seule une fiche vérifiée et pas encore publiée peut être programmée.', path: ['publierLe'],
  }).refine((fiche) => fiche.kind !== 'recette' || (fiche.etagere && fiche.donnees && fiche.autorisations.length > 0), {
    message: 'Une recette précise son étagère, les données touchées et ses autorisations.', path: ['etagere'],
  }).refine((fiche) => fiche.kind !== 'premiers-pas' || fiche.ordre, {
    message: 'Un tuto « Premiers pas » a un ordre de lecture.', path: ['ordre'],
  }),
});

export const collections = { blog, bd, briefs, atelier };
