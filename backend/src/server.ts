import fastify from 'fastify';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB } from './config/mongo';
import { logger } from './utils/logger';
import { gitHubCodeLeakFarmService } from './services/GitHubCodeLeakFarmService';

const server = fastify({
  logger: config.NODE_ENV === 'development' ? {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : {
    level: 'warn',
  },
});

async function startServer() {
  try {
    // Validate GitHub tokens
    if (!config.GITHUB_TOKEN || config.GITHUB_TOKEN.length < 10) {
      logger.init('GitHub token invalid or missing. Exiting.');
      process.exit(1);
    }
    // Connect to MongoDB
    try {
      await connectToMongoDB();
    } catch (err: any) {
      logger.init(`MongoDB connection failed: ${err?.message || err}`);
      process.exit(1);
    }
    // Start the GitHub code leak farm service
    try {
      gitHubCodeLeakFarmService.start();
    } catch (err: any) {
      logger.init(`Leak farm failed to start: ${err?.message || err}`);
      process.exit(1);
    }
    // Start the server
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.init(`All systems operational. GitHub tokens loaded: 1`);

    // Idle message logic: print after 5 seconds if no scan or leak log
    (globalThis as any).__activitySinceStartup = false;
    setTimeout(() => {
      if (!(globalThis as any).__activitySinceStartup) {
        logger.init('No new files to scan. System is idle, waiting for new changes...');
      }
    }, 5000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.status('Shutting Down', 'Gracefully...');
      await disconnectFromMongoDB();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.status('Shutting Down', 'Gracefully...');
      await disconnectFromMongoDB();
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    logger.init(`Startup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

startServer();

export { server };