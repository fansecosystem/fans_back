export class CreateCategoryDto {
  name: string;
  description: string;
  thumbnail?: string;
  parent?: number;
}
