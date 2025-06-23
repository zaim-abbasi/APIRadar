import { FastifyInstance } from 'fastify';
import { getProvidersHandler } from '../controllers/providersController';

export async function providersRoutes(server: FastifyInstance) {
  server.get('/api/providers', {
    handler: getProvidersHandler,
  });
} 