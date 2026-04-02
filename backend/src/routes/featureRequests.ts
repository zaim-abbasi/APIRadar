import { FastifyInstance } from 'fastify';
import {
  createFeatureRequestHandler,
  createFeatureRequestSchema
} from '../controllers/featureRequestController';
import { authenticateUser } from '../middleware/auth';

export async function featureRequestsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);
  server.post('/feature-requests', { schema: createFeatureRequestSchema }, createFeatureRequestHandler);
}
