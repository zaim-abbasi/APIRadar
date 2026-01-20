import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retryWithBackoff';

let isConnected = false;

function log(level: 'info' | 'warn' | 'error', message: string) {
  const prefixed = `[DB] ${message}`;
  if (level === 'info') logger.init(prefixed);
  else if (level === 'warn') logger.warn(prefixed);
  else logger.error(prefixed);
}

function redactUri(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/i, (_, p1, p2) => `${p1}${p2}:***@`);
}

const TRANSIENT_CODES = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT'];

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) return;
  const mongoUri = config.MONGODB_URI;
  log('info', `MongoDB connect attempt | uri: ${redactUri(mongoUri)}`);
  let attempt = 1;

  await retryWithBackoff(async () => {
    try {
      await mongoose.connect(mongoUri, {
        minPoolSize: 2,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        family: 4,
      });
      isConnected = true;
    } catch (err: any) {
      if (err?.code && TRANSIENT_CODES.includes(err.code)) {
        log('warn', `Transient MongoDB connect error (attempt ${attempt++}): [${err.code}] ${err.message}`);
        throw err;
      } else if (err?.message?.match(/Authentication failed|bad auth|auth|invalid/i)) {
        log('error', `Fatal MongoDB connection/auth error (uri: ${redactUri(mongoUri)})`);
        throw new Error('FATAL');
      } else {
        log('error', `Unhandled Mongo error: ${err.message}`);
        throw err;
      }
    }
  }, { maxRetries: 7, baseDelay: 1200, maxDelay: 60000 });

  mongoose.connection.on('index', (indexInfo: any) => {
    const indexName = typeof indexInfo === 'string' ? indexInfo : indexInfo?.name || '';
    if (indexName.includes('leaks')) {
      log('info', `Created index: ${indexName}`);
      if (!indexName.includes('unique')) {
        log('error', `CRITICAL: Index on leaks collection missing unique constraint: ${indexName}`);
      }
    }
  });

  mongoose.connection.on('error', (error: Error & { code?: string }) => {
    log(TRANSIENT_CODES.includes(error.code || '') ? 'warn' : 'error', `MongoDB connection error: [${error.code}] ${error.message}`);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    log('warn', `MongoDB disconnected (uri: ${redactUri(mongoUri)})`);
    isConnected = false;
    const jitteredDelay = Math.floor(Math.random() * 5000) + 2000;
    setTimeout(() => {
      if (!isConnected) {
        log('info', 'Attempting auto-recovery...');
        connectToMongoDB().catch(e => log('error', `Auto-recovery failed: ${e.message}`));
      }
    }, jitteredDelay);
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
    log('error', `Error disconnecting: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

