import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.string(),
    excerpt: z.string().optional(),
  }),
});

const cases = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    client: z.string(),
    date: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, cases };
