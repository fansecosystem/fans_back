import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().min(0),
  type: z.string().min(3).max(255),
  thumbnail: z.string().optional(),
});
