import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';

export function expressAuthentication(
  req: Request,
  securityName: string,
  _scopes?: string[]
): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    if (securityName !== 'jwt') {
      return reject(new Error('Unknown security scheme'));
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      const error: any = new Error('Missing or malformed Authorization header');
      error.status = 401;
      return reject(error);
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      req.user = payload;
      resolve(payload);
    } catch {
      const error: any = new Error('Invalid or expired token');
      error.status = 401;
      reject(error);
    }
  });
}