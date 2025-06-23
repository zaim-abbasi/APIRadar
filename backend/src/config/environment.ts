import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  TRUFFLEHOG_PATH: z.string().default('trufflehog'),
  SCAN_INTERVAL_MINUTES: z.string().transform(Number).default('30'),
  MAX_REPOS_PER_SCAN: z.string().transform(Number).default('10'),
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'),
});

export const config = envSchema.parse(process.env);