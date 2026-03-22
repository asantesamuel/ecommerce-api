import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ValidateError) {
    res.status(422).json({ message: 'Validation error', fields: err.fields });
    return;
  }
  if (err instanceof Error) {
    const status = (err as any).status ?? 500;
    res.status(status).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: 'Internal server error' });
}
