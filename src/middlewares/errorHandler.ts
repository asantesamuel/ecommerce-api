import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ValidateError) {
    res.status(422).json({
      message: 'Validation error',
      fields: err.fields,
    });
    return;
  }

  if (err.status) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}