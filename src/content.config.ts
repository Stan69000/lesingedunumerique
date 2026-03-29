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
  }),
});

export const collections = { blog };
