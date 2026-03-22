import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const schema = z.object({
  NODE_ENV:                  z.enum(['development', 'test', 'production']).default('development'),
  PORT:                      z.string().default('3000'),
  DATABASE_URL:              z.string().url(),
  JWT_ACCESS_SECRET:         z.string().min(32),
  JWT_REFRESH_SECRET:        z.string().min(32),
  STRIPE_SECRET_KEY:         z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET:     z.string(),
  AWS_REGION:                z.string(),
  AWS_ACCESS_KEY_ID:         z.string(),
  AWS_SECRET_ACCESS_KEY:     z.string(),
  S3_BUCKET_PRODUCTS:        z.string(),
  S3_BUCKET_DOCUMENTS:       z.string(),
  CLOUDFRONT_DOMAIN:         z.string(),
  VENDOR_ONBOARDING_FEE:     z.string().default('5000'),
  FRONTEND_URL:              z.string().url(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
