import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../utils/logger';

let isConnected = false;
let externalLogger: any = null;

export function setLogger(loggerInstance: any) {
  externalLogger = loggerInstance;
  // Only log in development and only for new index creation
  mongoose.set('debug', false); // Disable general debug logging
}

function log(level: 'info' | 'warn' | 'error', message: string) {
  if (externalLogger) {
    externalLogger[level](`[DB] ${message}`);
  } else {
    logger[level]('db', message);
  }
}

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) return;
  try {
    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    isConnected = true;
    
    // Log only when indexes are created (not when they already exist)
    mongoose.connection.on('index', (indexName: string) => {
      if (indexName.includes('leaks')) {
        log('info', `Created new index: ${indexName}`);
      }
    });
    
    mongoose.connection.on('error', (error: Error) => {
      log('error', `MongoDB connection error: ${error.message}`);
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
  } catch (error) {
    log('error', `Failed to connect to MongoDB: ${(error instanceof Error ? error.message : String(error))}`);
    throw error;
  }
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