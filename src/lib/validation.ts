import { z } from "zod";

/** Request body schemas for API routes */

export const entryTypeSchema = z.enum(["movie", "series", "book", "cafe", "restaurant_dish"]);

export const enrichRequestSchema = z.object({
  entryId: z.uuid(),
  title: z.string().min(1).max(500),
  type: entryTypeSchema,
  link: z.string().max(2000).nullish(),
  impression: z.string().max(5000).nullish(),
});

export const recommendRequestSchema = z.object({
  entryType: entryTypeSchema.optional(),
  exclude: z.array(z.string().max(500)).max(100).optional(),
});

export const parseLinkRequestSchema = z.object({
  url: z.url().max(2000),
});
