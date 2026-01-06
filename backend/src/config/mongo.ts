import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../utils/logger';

let isConnected = false;
let externalLogger: any = null;

export function setLogger(loggerInstance: any) {
  externalLogger = loggerInstance;
  mongoose.set('debug', false);
}

function log(level: 'info' | 'warn' | 'error', message: string) {
  if (externalLogger) {
    externalLogger[level](`[DB] ${message}`);
  } else {
    if (level === 'info') {
      logger.init(`[DB] ${message}`);
    } else if (level === 'warn') {
      logger.warn(`[DB] ${message}`);
    } else if (level === 'error') {
      logger.error(`[DB] ${message}`);
    }
  }
}

import { retryWithBackoff } from '../utils/retryWithBackoff';

function redactUri(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/i, (_, p1, p2) => `${p1}${p2}:***@`);
}

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) return;
  const mongoUri = config.MONGODB_URI;
  log('info', `MongoDB connect attempt | uri: ${redactUri(mongoUri)}`);
  let attempt = 1;
  const maxAttempts = 8;
  const transientCodes = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT'];
  await retryWithBackoff(async () => {
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 200,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });
      isConnected = true;
    } catch (err: any) {
      if (err?.code && transientCodes.includes(err.code)) {
        log('warn', `Transient MongoDB connect error (attempt ${attempt++}): [${err.code}] ${err.message}`);
        throw err;
      } else if (err?.message?.match(/Authentication failed|bad auth|auth|invalid/i)) {
        log('error', `Fatal MongoDB connection/auth error: ${err.message}`);
        throw new Error('FATAL');
      } else {
        log('error', `Unhandled Mongo error: ${err.message}`);
        throw err;
      }
    }
  }, { maxRetries: maxAttempts - 1, baseDelay: 1200, maxDelay: 60000 });

  mongoose.connection.on('index', (indexName: string) => {
    if (indexName.includes('leaks')) log('info', `Created new index: ${indexName}`);
  });
  mongoose.connection.on('error', (error: Error & { code?: string }) => {
    log(transientCodes.includes(error.code || '') ? 'warn' : 'error', `MongoDB connection error: [${error.code}] ${error.message}`);
    isConnected = false;
  });
  mongoose.connection.on('disconnected', () => {
    log('warn', 'MongoDB disconnected');
    isConnected = false;
  });
  mongoose.connection.on('reconnected', () => {
    log('info', 'MongoDB reconnected');
    isConnected = true;
  });
  logger.status('MongoDB', 'Connected');
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    log('info', 'MongoDB disconnected successfully');
    logger.status('MongoDB', 'Disconnected');
  } catch (error) {
    log('error', `Error disconnecting from MongoDB: ${(error instanceof Error ? error.message : String(error))}`);
    throw error;
  }
}

export function getConnectionStatus(): boolean {
  return isConnected;
}