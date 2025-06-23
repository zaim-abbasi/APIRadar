import { FastifyInstance } from 'fastify';
import { getLearnHandler } from '../controllers/learnController';

export async function learnRoutes(server: FastifyInstance) {
  server.get('/api/learn', {
    handler: getLearnHandler,
  });
} 