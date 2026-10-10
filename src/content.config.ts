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
    type: z.enum(['weekly', 'monthly']).default('weekly'),
    draft: z.boolean().default(true),
    demo: z.boolean().default(false),
    scams: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1) })).min(1),
    sources: z.array(z.object({ title: z.string().min(1), url: z.string().url().startsWith('https://') })).min(1),
  }).refine((brief) => brief.periodStart <= brief.periodEnd, {
    message: 'La fin de période doit suivre son début.', path: ['periodEnd'],
  }),
});

export const collections = { blog, bd, briefs };
