import { FastifyInstance } from 'fastify';
import { getLeaksHandler, getLeakFullKeyHandler } from '../controllers/exploreController';
import { authenticateUser } from '../middleware/auth';

export async function leaksRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  server.get('/api/leaks', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          timeRange: { type: 'string' },
          sortBy: { type: 'string' },
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
            planLimits: {
              type: 'object',
              properties: {
                maxLeaks: { type: 'number' }
              }
            }
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        429: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            retryAfter: { type: 'number' }
          }
        }
      },
    },
    handler: getLeaksHandler,
  });
  server.get('/api/leaks/:id/fullkey', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            redactedKey: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            upgradeRequired: { type: 'boolean' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: getLeakFullKeyHandler
  });
} 