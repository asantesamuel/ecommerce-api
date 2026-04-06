import { z }       from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

const schema = z.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV:  z.enum(['development', 'test', 'production']).default('development'),
  PORT:      z.string().default('3000'),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:  z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // ── Paystack ──────────────────────────────────────────────────────────────
  PAYSTACK_SECRET_KEY: z.string().startsWith('sk_', 'PAYSTACK_SECRET_KEY must start with sk_'),
  PAYSTACK_PUBLIC_KEY: z.string().startsWith('pk_', 'PAYSTACK_PUBLIC_KEY must start with pk_'),

  // ── AWS ───────────────────────────────────────────────────────────────────
  AWS_REGION:            z.string().min(1),
  AWS_ACCESS_KEY_ID:     z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_PRODUCTS:    z.string().min(1),
  S3_BUCKET_DOCUMENTS:   z.string().min(1),
  CLOUDFRONT_DOMAIN:     z.string().url('CLOUDFRONT_DOMAIN must be a valid URL'),

  // ── Business ──────────────────────────────────────────────────────────────
  VENDOR_ONBOARDING_FEE: z.string().default('5000'),
  FRONTEND_URL:          z.string().url('FRONTEND_URL must be a valid URL'),

  // ── Tax ───────────────────────────────────────────────────────────────────
  TAX_RATE: z.string().default('0.15'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Environment variable validation failed:\n');
  const errors = parsed.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([key, messages]) => {
    console.error(`   ${key}: ${messages?.join(', ')}`);
  });
  console.error('\nPlease check your .env file and fix the above issues.\n');
  process.exit(1);
}

export const env = parsed.data;

// Derived helpers
export const isDev        = env.NODE_ENV === 'development';
export const isProd       = env.NODE_ENV === 'production';
export const isTest       = env.NODE_ENV === 'test';
export const TAX_RATE     = parseFloat(env.TAX_RATE);
export const ONBOARDING_FEE = parseInt(env.VENDOR_ONBOARDING_FEE);