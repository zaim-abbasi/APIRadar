import fastify from 'fastify';
import { config } from './config/environment';
import { registerPlugins } from './config/plugins';
import { connectToMongoDB, disconnectFromMongoDB, getConnectionStatus } from './config/mongo';
import { logger } from './utils/logger';
import { gitHubCodeLeakFarmService } from './services/GitHubCodeLeakFarmService';
import { gitHubEventsListener } from './services/GitHubEventsListener';
import { ConfigurationService } from './services/ConfigurationService';
import { startBackupScheduler, stopBackupScheduler } from './services/backupScheduler';
import { registerRoutes } from './routes';
import { fatalErrorRecoveryManager } from './utils/fatalErrorRecovery';

// 1. Top-level Error Handling (Fail Fast & log)
process.on('unhandledRejection', (reason, _promise) => {
  logger.error(`[FATAL] Unhandled Rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`[FATAL] Uncaught Exception: ${error.stack || error.message}`);
  // We opt to crash here to let the process manager (Docker/PM2) restart us clean
  // attempting to recover from uncaught exception state is risky.
  process.exit(1);
});

let activeServer: any = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.status('Shutting Down', `Signal: ${signal}`);

  try {
    logger.init('Stopping services...');
    stopBackupScheduler();
    gitHubCodeLeakFarmService.stop();
    gitHubEventsListener.stop();

    if (activeServer) {
      await activeServer.close();
      logger.init('HTTP Server closed');
    }

    await disconnectFromMongoDB();
    logger.status('System', 'Shutdown Complete');
    process.exit(0);
  } catch (err) {
    logger.error(`[FATAL] Error during shutdown: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function bootstrap() {
  const server = fastify({
    logger: false,
    disableRequestLogging: true,
    trustProxy: true
  });
  activeServer = server;

  // 1. Register Plugins & Routes
  await registerPlugins(server);

  await registerRoutes(server);

  // 2. Health Check (Titan Grade: Real DB Status)
  server.get('/health', async (_req, reply) => {
    const mongoConnected = getConnectionStatus();
    if (!mongoConnected) {
      return reply.code(503).send({ status: 'error', mongo: 'disconnected' });
    }
    return reply.send({ status: 'ok', mongo: 'connected' });
  });

  // 3. Validation: GitHub Token
  logger.init(`Initialized with ${config.GITHUB_TOKEN.length} static and dynamic pool enabled`);

  // 4. Connect to Database (Critical Dependency)
  try {
    await connectToMongoDB();
  } catch (dbError) {
    throw new Error(`Failed to connect to MongoDB: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
  }

  // 5. Initialize Configuration
  try {
    await ConfigurationService.initializeDefaults();
    logger.init('Configuration initialized');
  } catch (configError) {
    logger.error(`Configuration init failed: ${configError instanceof Error ? configError.message : String(configError)}`);
  }

  // 6. Start Background Services
  try {
    await gitHubCodeLeakFarmService.start();
    await gitHubEventsListener.start();
    await startBackupScheduler();
  } catch (serviceError) {
    throw new Error(`Failed to start services: ${serviceError instanceof Error ? serviceError.message : String(serviceError)}`);
  }

  // 7. Start Server
  await server.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.init(`Server listening at http://0.0.0.0:${config.PORT}`);
  logger.status('System', 'Operational');
}

// Start Server
bootstrap().catch(err => {
  logger.error(`[FATAL] Initial startup failed: ${err.message}`);
  fatalErrorRecoveryManager.handleFatalError(
    err,
    async () => {
      logger.warn('[FATAL] Retrying startup...');
      await bootstrap();
    }
  ).catch(fatalErr => {
    logger.error(`[FATAL] Startup recovery exhausted: ${fatalErr.message}`);
    process.exit(1);
  });
});

// Signal Handling
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export const server = {
  get current() { return activeServer; }
};
