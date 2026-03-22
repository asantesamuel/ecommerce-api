import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
