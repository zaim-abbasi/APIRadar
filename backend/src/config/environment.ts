import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string()
    .transform((val) => {
      const port = Number(val);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be a valid port number between 1 and 65535');
      }
      return port;
    })
    .default('3001'),
  MONGODB_URI: z.string()
    .min(1, 'MongoDB URI is required')
    .refine((uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'), {
      message: 'MongoDB URI must be a valid MongoDB connection string'
    }),
  GITHUB_TOKEN: z.string()
    .min(1, 'GitHub token is required')
    .refine((token) => {
      // Support comma-separated tokens
      const tokens = token.split(',').map(t => t.trim()).filter(Boolean);
      return tokens.every(t => t.startsWith('ghp_') || t.startsWith('github_pat_'));
    }, {
      message: 'GitHub token(s) must be valid GitHub personal access tokens (comma-separated for multiple tokens)'
    }),
  GITHUB_TOKENS: z.string().optional().transform((val) => {
    if (!val) return [];
    return val.split(',').map(token => token.trim()).filter(token => 
      token.startsWith('ghp_') || token.startsWith('github_pat_')
    );
  }),
  MAX_REPOS_PER_SCAN: z.string()
    .transform((val) => {
      const repos = Number(val);
      if (isNaN(repos) || repos < 1 || repos > 1000) {
        throw new Error('MAX_REPOS_PER_SCAN must be between 1 and 1000');
      }
      return repos;
    })
    .default('10'),
  RATE_LIMIT_MAX: z.string()
    .transform((val) => {
      const limit = Number(val);
      if (isNaN(limit) || limit < 1) {
        throw new Error('RATE_LIMIT_MAX must be a positive number');
      }
      return limit;
    })
    .default('100'),
  RATE_LIMIT_WINDOW: z.string()
    .transform((val) => {
      const window = Number(val);
      if (isNaN(window) || window < 1000) {
        throw new Error('RATE_LIMIT_WINDOW must be at least 1000ms');
      }
      return window;
    })
    .default('900000'),
  GITHUB_RATE_LIMIT_DELAY: z.string()
    .transform((val) => {
      const delay = Number(val);
      if (isNaN(delay) || delay < 0) {
        throw new Error('GITHUB_RATE_LIMIT_DELAY must be a non-negative number');
      }
      return delay;
    })
    .default('1000'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      logger.error('Environment validation failed:');
      logger.error(errorMessages);
      logger.error('Please check your .env file and ensure all required variables are set correctly.');
      process.exit(1);
    }
    throw error;
  }
}

export const config = validateEnv();