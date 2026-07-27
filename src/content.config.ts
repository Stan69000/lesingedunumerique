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

const jeux = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jeux' }),
  schema: z
    .object({
      titre: z.string(),
      accroche: z.string(),
      resume: z.string(),
      description: z.string(),
      badge: z.string(),
      publics: z.array(z.enum(['Enfants', 'Ados', 'Adultes'])).min(1),
      themes: z.array(z.string()).min(1),
      duree: z.string().optional(),
      statut: z.enum(['disponible', 'bientot']).default('disponible'),
      sortiePrevue: z.string().optional(),
      fichier: z.string().optional(),
      ordre: z.number().default(50),
      aLaUne: z.boolean().default(false),
      icone: z.enum(['manette', 'bouclier', 'loupe', 'cadenas', 'message']).default('manette'),
      visuel: z.enum(['emeraude', 'azur', 'violet', 'ambre']).default('emeraude'),
    })
    .superRefine((jeu, ctx) => {
      if (jeu.statut === 'disponible' && !jeu.fichier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fichier'],
          message: 'Un jeu au statut "disponible" doit indiquer le fichier du jeu (ex: /jeux/sentinel.html).',
        });
      }
    }),
});

export const collections = { blog, jeux };
