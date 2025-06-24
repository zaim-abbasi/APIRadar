import fastify from 'fastify';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB, setLogger } from './config/mongo';
import { registerPlugins } from './config/plugins';
import { registerRoutes } from './routes';
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
    // Set up MongoDB logger
    setLogger(logger);

    // Connect to MongoDB
    await connectToMongoDB();

    // Register plugins and routes
    await registerPlugins(server);
    await registerRoutes(server);

    // Start the GitHub code leak farm service
    gitHubCodeLeakFarmService.start();

    // Start the server
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.status('Server Running', `http://localhost:${config.PORT}`);

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
    logger.error('init', `Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

startServer();

export { server };