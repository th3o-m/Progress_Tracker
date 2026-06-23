import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../utils/http.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message, ...(error.details ? { fields: error.details } : {}) });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};

