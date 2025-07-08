import z, { ZodSchema } from 'zod';

type ValidationResult<T extends ZodSchema> =
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Record<string, string> };

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
