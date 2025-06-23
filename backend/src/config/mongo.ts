import mongoose from 'mongoose';
import { config } from './environment';

let isConnected = false;

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    isConnected = true;

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export function getConnectionStatus(): boolean {
  return isConnected;
}