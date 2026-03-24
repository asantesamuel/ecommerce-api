import rateLimit from 'express-rate-limit';

// Applied globally to all /auth/* routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: {
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});

// Stricter limiter specifically for login
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: {
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
  },
});