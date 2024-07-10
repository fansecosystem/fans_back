import { z } from 'zod';

export const authTokenSchema = z.object({
  email: z.string().email({ message: 'invalid' }),
  password: z.string().min(8),
});
