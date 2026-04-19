import { FastifyInstance } from 'fastify';
import {
  getLeaksHandler,
  getLeakFullKeyHandler,
  getProviderStatsHandler,
  getLeaksSchema,
  getLeakFullKeySchema,
  getProviderStatsSchema
} from '../controllers/exploreController';
import { authenticateUser } from '../middleware/auth';

export async function leaksRoutes(server: FastifyInstance) {
  server.addHook('preValidation', authenticateUser);
  server.get('/leaks', { schema: getLeaksSchema }, getLeaksHandler);
  server.get('/leaks/:id/fullkey', { 
    schema: getLeakFullKeySchema,
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '1 minute'
      }
    }
  }, getLeakFullKeyHandler);
  server.get('/stats/providers', { schema: getProviderStatsSchema }, getProviderStatsHandler);
}