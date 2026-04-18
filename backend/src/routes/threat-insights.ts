import { FastifyInstance } from 'fastify';
import {
  getThreatInsightsActivityHandler,
  getThreatInsightsDataHandler,
  getTopExposuresHandler,
  threatInsightsDataSchema,
  activitySchema,
  topExposuresSchema
} from '../controllers/threatInsightsController';

export async function threatInsightsRoutes(server: FastifyInstance) {
  server.get('/threat-insights', { schema: threatInsightsDataSchema }, getThreatInsightsDataHandler);
  server.get('/threat-insights/activity', { schema: activitySchema }, getThreatInsightsActivityHandler);
  server.get('/threat-insights/top-exposures', { schema: topExposuresSchema }, getTopExposuresHandler);
}