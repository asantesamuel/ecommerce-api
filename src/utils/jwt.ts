import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: '15m',
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET as string
  ) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET as string
  ) as JwtPayload;
}