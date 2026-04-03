import { FastifyInstance } from 'fastify';
import {
  getLeaksHandler,
  getLeakFullKeyHandler,
  getProviderStatsHandler,
  getLiveStatsHandler,
  getLeaksSchema,
  getLeakFullKeySchema,
  getProviderStatsSchema,
  getLiveStatsSchema
} from '../controllers/exploreController';
import { authenticateUser } from '../middleware/auth';

export async function leaksRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);
  server.get('/leaks', { schema: getLeaksSchema }, getLeaksHandler);
  server.get('/leaks/:id/fullkey', { schema: getLeakFullKeySchema }, getLeakFullKeyHandler);
  server.get('/stats/providers', { schema: getProviderStatsSchema }, getProviderStatsHandler);
  server.get('/stats/live', { schema: getLiveStatsSchema }, getLiveStatsHandler);
}