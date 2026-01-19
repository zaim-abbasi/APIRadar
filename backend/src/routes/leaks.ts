import { FastifyInstance } from 'fastify';
import {
  getLeaksHandler,
  getLeakFullKeyHandler,
  getLeaksSchema,
  getLeakFullKeySchema
} from '../controllers/exploreController';
import { authenticateUser } from '../middleware/auth';

export async function leaksRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);
  server.get('/leaks', { schema: getLeaksSchema }, getLeaksHandler);
  server.get('/leaks/:id/fullkey', { schema: getLeakFullKeySchema }, getLeakFullKeyHandler);
}