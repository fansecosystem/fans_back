import { z } from 'zod';

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'invalid' }),
  password: z.string().min(8),
  verificationCode: z.string().min(1),
});
