import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().pipe(z.number().min(1).max(65535)).default(3001),
  MONGODB_URI: z.string().min(1).refine(uri => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')),
  GITHUB_TOKEN: z.string().min(1)
    .refine(val => val.split(',').every(t => t.trim().startsWith('ghp_') || t.trim().startsWith('github_pat_')))
    .transform(val => val.split(',').map(t => t.trim())),
  MAX_REPOS_PER_SCAN: z.coerce.number().pipe(z.number().min(1).max(1000)).default(10),
  MAX_PAGES_PER_QUERY: z.coerce.number().pipe(z.number().min(1).max(1000)).default(100),
  RATE_LIMIT_MAX: z.coerce.number().pipe(z.number().min(1)).default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().pipe(z.number().min(1000)).default(900000),
  GITHUB_RATE_LIMIT_DELAY: z.coerce.number().pipe(z.number().min(0)).default(1000),
  NEXTAUTH_SECRET: z.string().min(1),
  CORS_ORIGINS: z.string().default('https://apiradar.live,https://www.apiradar.live,https://api.apiradar.live,http://localhost:3000')
    .transform(val => val.split(',').map(origin => origin.trim())),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(e => console.error(`ENV VALIDATION FAILED: ${e.path.join('.')}: ${e.message}`));
      process.exit(1);
    }
    throw error;
  }
}

export const config = Object.freeze(validateEnv());
export const GITHUB_TOKEN_POOL = config.GITHUB_TOKEN;