import { Request, Response, NextFunction } from 'express';
import { ValidateError }                   from 'tsoa';
import { AppError }                        from '../utils/AppError';

export interface ErrorResponse {
  success:   false;
  code:      string;
  message:   string;
  details?:  any;
  timestamp: string;
  path:      string;
}

export function errorHandler(
  err:  any,
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const path      = req.path;

  // tsoa validation error — field-level validation failures
  if (err instanceof ValidateError) {
    const response: ErrorResponse = {
      success:   false,
      code:      'VALIDATION_ERROR',
      message:   'Request validation failed',
      details:   Object.entries(err.fields || {}).reduce(
        (acc, [field, info]: [string, any]) => {
          acc[field] = info.message;
          return acc;
        },
        {} as Record<string, string>
      ),
      timestamp,
      path,
    };
    res.status(422).json(response);
    return;
  }

  // Known application error
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success:   false,
      code:      err.code,
      message:   err.message,
      details:   err.details,
      timestamp,
      path,
    };
    res.status(err.status).json(response);
    return;
  }

  // Legacy errors thrown as plain objects with .status
  if (err?.status && err?.message) {
    const response: ErrorResponse = {
      success:   false,
      code:      `HTTP_${err.status}`,
      message:   err.message,
      timestamp,
      path,
    };
    res.status(err.status).json(response);
    return;
  }

  // PostgreSQL / TypeORM errors
  if (err?.code === '23505') {
    const response: ErrorResponse = {
      success:   false,
      code:      'CONFLICT',
      message:   'A record with this value already exists',
      timestamp,
      path,
    };
    res.status(409).json(response);
    return;
  }

  if (err?.code === '23503') {
    const response: ErrorResponse = {
      success:   false,
      code:      'REFERENCE_ERROR',
      message:   'Referenced record does not exist',
      timestamp,
      path,
    };
    res.status(400).json(response);
    return;
  }

  // Unknown error — log it and return generic response
  console.error('Unhandled error:', err);

  const response: ErrorResponse = {
    success:   false,
    code:      'INTERNAL_ERROR',
    message:   process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err?.message || 'Internal server error',
    timestamp,
    path,
  };
  res.status(500).json(response);
}