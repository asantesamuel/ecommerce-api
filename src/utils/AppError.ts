export class AppError extends Error {
  public readonly status:  number;
  public readonly code:    string;
  public readonly details: any;

  constructor(
    message: string,
    status  = 500,
    code    = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name    = 'AppError';
    this.status  = status;
    this.code    = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory methods for common error types ────────────────────────────────
  static badRequest(message: string, details?: any): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static tooManyRequests(message: string): AppError {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }

  static badGateway(message: string): AppError {
    return new AppError(message, 502, 'BAD_GATEWAY');
  }
}