import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB } from './config/mongo';
import { logger } from './utils/logger';
import { gitHubCodeLeakFarmService } from './services/GitHubCodeLeakFarmService';
import { ConfigurationService } from './services/ConfigurationService';
import { startBackupScheduler, stopBackupScheduler } from './services/backupScheduler';
import { registerRoutes } from './routes';

const server = fastify({
  logger: false,
});

async function startServer() {
  server.get('/health', async (_req, reply) => {
    const mongoOk = !!require('./config/mongo').getConnectionStatus?.();
    reply.send({
      status: 'ok',
      mongo: mongoOk ? 'connected' : 'unavailable'
    });
  });
  process.on('unhandledRejection', (reason, _promise) => {
    logger.error(`[FATAL] Unhandled Promise Rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
  });
  process.on('uncaughtException', (error) => {
    logger.error(`[FATAL] Uncaught Exception: ${error.stack || error.message}`);
    process.exit(1);
  });
  try {
    await server.register(cors, {
      origin: [
        'https://apiradar.live',
        'https://www.apiradar.live',
	'https://api.apiradar.live',
        'http://localhost:3000', // For local development
      ],
      credentials: true,
    });
    await registerRoutes(server);
    if (!config.GITHUB_TOKEN || config.GITHUB_TOKEN.length < 10) {
      logger.init('GitHub token invalid or missing. Exiting.');
      process.exit(1);
    }
    try {
      await connectToMongoDB();
    } catch (err: any) {
      logger.init(`MongoDB connection failed: ${err?.message || err}`);
      process.exit(1);
    }
    try {
      await ConfigurationService.initializeDefaults();
      logger.init('Configuration initialized successfully');
    } catch (err: any) {
      logger.init(`Configuration initialization failed: ${err?.message || err}`);
    }
    try {
      await gitHubCodeLeakFarmService.start();
    } catch (err: any) {
      logger.init(`Leak farm failed to start: ${err?.message || err}`);
      process.exit(1);
    }
    startBackupScheduler();
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.init(`Server listening at http://0.0.0.0:${config.PORT}`);
    const tokenCount = (config.GITHUB_TOKEN || '').split(',').map(t => t.trim()).filter(Boolean).length;
    logger.init(`All systems operational. GitHub tokens loaded: ${tokenCount}`);
    process.on('SIGINT', async () => {
      logger.status('Shutting Down', 'Gracefully...');
      stopBackupScheduler();
      gitHubCodeLeakFarmService.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await disconnectFromMongoDB();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.status('Shutting Down', 'Gracefully...');
      stopBackupScheduler();
      gitHubCodeLeakFarmService.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
