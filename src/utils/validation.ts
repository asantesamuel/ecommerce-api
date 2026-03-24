import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export async function validateDto<T extends object>(
  DtoClass: new () => T,
  plain: object
): Promise<{ valid: boolean; errors: Record<string, string[]> }> {
  const instance = plainToInstance(DtoClass, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: false,
  });

  if (errors.length === 0) return { valid: true, errors: {} };

  const formatted: Record<string, string[]> = {};
  for (const err of errors) {
    formatted[err.property] = Object.values(err.constraints || {});
  }
  return { valid: false, errors: formatted };
}