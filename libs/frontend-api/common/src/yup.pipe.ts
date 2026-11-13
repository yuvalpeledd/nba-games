import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { AnySchema, InferType, ValidationError } from 'yup';

// Validates and casts a request value (body, param, query) with a schema from its dtos lib. Unknown fields are stripped.
export class YupPipe<T extends AnySchema> implements PipeTransform {
  constructor(private readonly schema: T) {}

  async transform(
    value: unknown,
    { data }: ArgumentMetadata,
  ): Promise<InferType<T>> {
    // A single route param or query key is named in its messages ("id must be ...", not "this must be ...").
    const schema = data ? this.schema.label(data) : this.schema;
    try {
      return await schema.validate(value, {
        abortEarly: false,
        stripUnknown: true,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new BadRequestException(error.errors);
      }
      throw error;
    }
  }
}
