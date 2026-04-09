import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

// Reuse a single Redis instance
export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const isTest = process.env.NODE_ENV === 'test';
const rateLimitStore = isTest
  ? new MemoryStore()
  : new RedisStore({
      sendCommand: (...args: string[]) => {
        if (typeof redisClient.call === 'function') {
          return redisClient.call(args[0], ...args.slice(1)) as any;
        }
        return (redisClient as any)[args[0].toLowerCase()](...args.slice(1));
      },
    });

// Applied globally to all /auth/* routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: isTest ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: {
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});

// Stricter limiter specifically for login
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: {
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
  },
});