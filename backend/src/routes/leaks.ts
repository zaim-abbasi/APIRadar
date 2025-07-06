import { FastifyInstance } from 'fastify';
import { getLeaksHandler, getLeakFullKeyHandler } from '../controllers/exploreController';
import { authenticateUser } from '../middleware/auth';

export async function leaksRoutes(server: FastifyInstance) {
  // Add authentication middleware to all leak routes
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
                maxLeaks: { type: 'number' },
                canInfiniteScroll: { type: 'boolean' },
                maxTimeRange: { type: 'string' }
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

  // Route for fetching the full key (Pro users only)
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
            fullKey: { type: 'string' }
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