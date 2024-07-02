import { z } from 'zod';

export const createPartnerSchema = z.object({
  name: z.string().min(3).max(255),
  categoryId: z.number().int(),
  thumbnail: z.string().optional(),
});
