import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One file per destination page. The slug (file name) must match the
// destinations.slug used by the pricing desk, so markup groups and, later,
// rate-card bands line up. No prices here: bands will come from the rate
// card when it exists (see TODO.md).
const destinations = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/destinations" }),
  schema: z.object({
    name: z.string(),
    country: z.string(),
    domestic: z.boolean(),
    order: z.number().default(100),
    summary: z.string().max(220),
    bestMonths: z.array(z.number().int().min(1).max(12)).min(1),
    image: z.url(),
    imageAlt: z.string(),
    inclusions: z.array(z.string()).min(1),
    itinerary: z.array(z.object({ days: z.string(), plan: z.string() })).min(1),
  }),
});

export const collections = { destinations };
