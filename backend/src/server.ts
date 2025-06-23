import fastify from 'fastify';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB } from './config/mongo';
import { registerPlugins } from './config/plugins';
import { registerRoutes } from './routes';
import { startScanScheduler } from './scheduler/scanRunner';

const server = fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    server.log.info('Connected to MongoDB');

    // Register plugins
    await registerPlugins(server);
    server.log.info('Plugins registered');

    // Register routes
    await registerRoutes(server);
    server.log.info('Routes registered');

    // Start the server
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    server.log.info(`Server listening on port ${config.PORT}`);

    // Start the scan scheduler
    if (config.NODE_ENV !== 'test') {
      startScanScheduler();
      server.log.info('Scan scheduler started');
    }
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  server.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await server.close();
    await disconnectFromMongoDB();
    server.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    server.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  server.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  server.log.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { server };