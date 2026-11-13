import { type AnySchema, ValidationError } from 'yup';

// The fields a form's values fail its schema on (every one, not just the first); none when they pass.
export async function invalidFields<Field extends string>(
  schema: AnySchema,
  values: Partial<Record<Field, unknown>>,
): Promise<Field[]> {
  try {
    await schema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    return error.inner.map(({ path }) => path as Field);
  }
}
