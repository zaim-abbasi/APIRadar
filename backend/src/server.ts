import fastify from 'fastify';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB, setLogger } from './config/mongo';
import { registerPlugins } from './config/plugins';
import { registerRoutes } from './routes';
import { startScanScheduler } from './scheduler/scanRunner';
import { logger } from './utils/logger';
import { execSync } from 'child_process';

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

function checkTrufflehogInstalled(): boolean {
  try {
    execSync('trufflehog --help', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  try {
    if (!checkTrufflehogInstalled()) {
      logger.error('init', '[FATAL][TRUFFLEHOG] TruffleHog is not installed or venv not activated. Please activate the virtual environment or follow setup instructions in backend/README.md.');
      process.exit(1);
    }
    setLogger(logger.raw);
    await connectToMongoDB();
    logger.info('db', 'MongoDB connected');

    await registerPlugins(server);
    await registerRoutes(server);
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    logger.info('init', `Server started at http://localhost:${config.PORT}`);

    if (config.NODE_ENV !== 'test') {
      startScanScheduler();
      logger.info('farm', 'Leak farm (scan scheduler) started');
    }
  } catch (error) {
    logger.error('error', `Startup error: ${(error instanceof Error ? error.message : String(error))}`);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.warn('init', `Received ${signal}, shutting down gracefully`);
  try {
    await server.close();
    await disconnectFromMongoDB();
    logger.info('init', 'Server closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('error', `Error during shutdown: ${(error instanceof Error ? error.message : String(error))}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('error', `Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('error', `Uncaught Exception: ${error}`);
  process.exit(1);
});

if (require.main === module) {
  start().catch((error) => {
    logger.error('error', `Failed to start server: ${(error instanceof Error ? error.message : String(error))}`);
    process.exit(1);
  });
}

export { server };