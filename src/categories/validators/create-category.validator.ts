import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  parent: z.string().optional(),
});
