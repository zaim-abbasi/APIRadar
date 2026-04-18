import { FastifyInstance } from 'fastify';
import { leaksRoutes } from './leaks';
import { threatInsightsRoutes } from './threat-insights';
import { configurationRoutes } from './configuration';
import { featureRequestsRoutes } from './featureRequests';

export async function registerRoutes(server: FastifyInstance) {
  server.register(leaksRoutes, { prefix: '/api' });
  server.register(threatInsightsRoutes, { prefix: '/api' });
  server.register(configurationRoutes, { prefix: '/api' });
  server.register(featureRequestsRoutes, { prefix: '/api' });
}