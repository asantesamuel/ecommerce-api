import { Request } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export function expressAuthentication(
  req: Request,
  securityName: string,
  _scopes?: string[]
): Promise<JwtPayload> {
  return new Promise(async (resolve, reject) => {
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
      
      const user = await AppDataSource.getRepository(User).findOne({
        where: { id: payload.sub },
        select: ['id', 'isActive'],
      });

      if (!user || !user.isActive) {
        const error: any = new Error(
          !user ? 'User not found' : 'Your account has been suspended'
        );
        error.status = 403;
        return reject(error);
      }

      req.user = payload;
      resolve(payload);
    } catch (err: any) {
      if (err.status === 403) return reject(err);
      const error: any = new Error('Invalid or expired token');
      error.status = 401;
      reject(error);
    }
  });
}
