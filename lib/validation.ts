import z, { ZodSchema } from 'zod';
import { Response } from '../helpers/response';

type ValidationResult<T extends ZodSchema> = Response<
  z.infer<T>,
  Record<string, string>
>;

export async function validate<T extends ZodSchema>(
  schema: T,
  data: unknown,
): Promise<ValidationResult<T>> {
  const res = await schema.safeParseAsync(data);

  if (!res.success) {
    return {
      success: false,
      errors: Object.fromEntries(
        res.error.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    };
  }

  return {
    success: true,
    data: res.data,
  };
}
