import { FastifyInstance } from 'fastify';
import {
  getScanStateHandler,
  updateScanStateHandler,
  getScanStateSchema,
  updateScanStateSchema
} from '../controllers/configurationController';

export async function configurationRoutes(server: FastifyInstance) {
  server.get('/config/scan-state', { schema: getScanStateSchema }, getScanStateHandler);
  server.put('/config/scan-state', { schema: updateScanStateSchema }, updateScanStateHandler);
}