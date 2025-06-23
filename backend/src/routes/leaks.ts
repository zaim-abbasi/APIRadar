import { FastifyInstance } from 'fastify';
import { getLeaksHandler } from '../controllers/leaksController';
import { z } from 'zod';

const querySchema = z.object({
  provider: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  page: z.string().transform(Number).optional(),
});

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
} 