import { cnpj, cpf } from 'cpf-cnpj-validator';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email({ message: 'invalid' }),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(8),
  document: z
    .string()
    .min(11)
    .refine(
      (document) => {
        return cpf.isValid(document) || cnpj.isValid(document);
      },
      { message: 'must be a valid cpf or cnpj' },
    ),
});
