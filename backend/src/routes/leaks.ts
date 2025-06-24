import { FastifyInstance } from 'fastify';
import { getLeaksHandler } from '../controllers/leaksController';
import { getLeakFullKeyHandler } from '../controllers/leakFullKeyController';

export async function leaksRoutes(server: FastifyInstance) {
  server.get('/api/leaks', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          limit: { type: 'string' },
          page: { type: 'string' }
        },
        required: []
      },
      response: {
        200: {
          type: 'object',
          properties: {
            leaks: { type: 'array' },
            total: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
    handler: getLeaksHandler,
  });

  // New route for fetching the full key
  server.get('/api/leaks/:id/fullkey', getLeakFullKeyHandler);
} 