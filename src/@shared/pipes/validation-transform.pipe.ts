import {
  BadRequestException,
  InternalServerErrorException,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ValidationTransform implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    console.log(value);
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(
          error.errors.map(
            (message) => `${message.path.join('')} ${message.message}`,
          ),
        );
      }
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
}
