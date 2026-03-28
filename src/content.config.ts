import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // Le loader indique explicitement où sont les fichiers .md
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // z.coerce.date() est crucial pour Astro v6 avec les dates YAML
    pubDate: z.coerce.date(), 
    tags: z.array(z.string()),
    author: z.string().optional(),
  }),
});

export const collections = { blog };