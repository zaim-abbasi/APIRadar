import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/environment';
import { connectToMongoDB, disconnectFromMongoDB } from './config/mongo';
import { logger } from './utils/logger';
import { gitHubCodeLeakFarmService } from './services/GitHubCodeLeakFarmService';
import { registerRoutes } from './routes';

const server = fastify({
  logger: false,
});

async function startServer() {
  try {
    // Register CORS
    await server.register(cors, {
      origin: true, // Allow all origins in development
      credentials: true,
    });

    // Register routes
    await registerRoutes(server);

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
    logger.init(`Server listening at http://0.0.0.0:${config.PORT}`);
    const tokenCount = (config.GITHUB_TOKEN || '').split(',').map(t => t.trim()).filter(Boolean).length;
    logger.init(`All systems operational. GitHub tokens loaded: ${tokenCount}`);

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
      
      // Stop the farm service first to save current state
      gitHubCodeLeakFarmService.stop();
      
      // Give a moment for the service to save its state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await disconnectFromMongoDB();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.status('Shutting Down', 'Gracefully...');
      
      // Stop the farm service first to save current state
      gitHubCodeLeakFarmService.stop();
      
      // Give a moment for the service to save its state
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