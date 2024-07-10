import { cnpj, cpf } from 'cpf-cnpj-validator';
import { z } from 'zod';

export const updateUserSchema = z.object({
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
