import { cnpj, cpf } from 'cpf-cnpj-validator';
import { z } from 'zod';

export const createUserSchema = z
  .object({
    email: z.string().email({ message: 'invalid' }),
    password: z.string().min(8),
    name: z.string().min(2),
    phone: z.string().min(8),
    document: z.string().optional().default('none'),
  })
  .superRefine((data, ctx) => {
    if (data.document === 'none') return true;
    if (!cpf.isValid(data.document) || !cnpj.isValid(data.document)) {
      ctx.addIssue({
        code: 'custom',
        message: 'must be a valid cpf or cnpj',
        path: ['document'],
      });
    }
  });
