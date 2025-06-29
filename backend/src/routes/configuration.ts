import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfigurationService } from '../services/ConfigurationService';

export async function configurationRoutes(server: FastifyInstance) {
  // Get scan state
  server.get('/api/config/scan-state', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scanState = await ConfigurationService.getScanState();
      if (scanState) {
        return reply.send({ scanState });
      } else {
        return reply.status(404).send({ error: 'Scan state not found' });
      }
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scan state' });
    }
  });

  // Set scan state
  server.post('/api/config/scan-state', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { scanState } = request.body as { scanState: any };
      
      if (!scanState) {
        return reply.status(400).send({ error: 'scanState is required' });
      }

      const success = await ConfigurationService.setScanState(scanState);
      if (success) {
        return reply.send({ message: 'Scan state updated successfully', scanState });
      } else {
        return reply.status(500).send({ error: 'Failed to update scan state' });
      }
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to update scan state' });
    }
  });

  // Get all configuration
  server.get('/api/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [repositoryAgeCutoff, scanState] = await Promise.all([
        ConfigurationService.getRepositoryAgeCutoff(),
        ConfigurationService.getScanState()
      ]);

      return reply.send({
        repositoryAgeCutoff: repositoryAgeCutoff?.toISOString(),
        scanState
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch configuration' });
    }
  });
} 