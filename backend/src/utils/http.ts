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

export interface Pagination {
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

export function getPagination(req: Request): Pagination | null {
  if (req.query.page === undefined && req.query.pageSize === undefined) return null;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25));
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function paginatedResponse<T>(rows: T[] | null, pagination: Pagination | null, total?: number | null): T[] | { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } {
  const data = rows ?? [];
  if (!pagination) return data;
  const safeTotal = total ?? data.length;
  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: safeTotal,
      totalPages: Math.ceil(safeTotal / pagination.pageSize),
    },
  };
}
