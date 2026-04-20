import { FastifyInstance } from 'fastify';
import {
  getThreatInsightsActivityHandler,
  getThreatInsightsDataHandler,
  getExposureHoursHandler,
  threatInsightsDataSchema,
  activitySchema,
  exposureHoursSchema,
} from '../controllers/threatInsightsController';

export async function threatInsightsRoutes(server: FastifyInstance) {
  server.get('/threat-insights', { schema: threatInsightsDataSchema }, getThreatInsightsDataHandler);
  server.get('/threat-insights/activity', { schema: activitySchema }, getThreatInsightsActivityHandler);
  server.get('/threat-insights/exposure-hours', { schema: exposureHoursSchema }, getExposureHoursHandler);
}