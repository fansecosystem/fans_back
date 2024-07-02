import { ProductType } from '@prisma/client';

export class CreateProductDto {
  name: string;
  description: string;
  price: number;
  quantity: number;
  type: ProductType;
  thumbnail?: string;
}
