import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => void Promise.resolve(handler(req, res, next)).catch(next);

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    throw new ApiError(400, 'Validation failed', {
      ...flattened.fieldErrors,
      ...(flattened.formErrors.length ? { _form: flattened.formErrors } : {}),
    });
  }
  return parsed.data;
}

export function assertFound<T>(value: T | null, message = 'Record not found'): asserts value is T {
  if (value === null) throw new ApiError(404, message);
}

export function throwDb(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === '23505') throw new ApiError(409, 'A record with this unique value already exists');
  if (error.code === '23503') throw new ApiError(400, 'Referenced record does not exist');
  throw new ApiError(500, error.message);
}
