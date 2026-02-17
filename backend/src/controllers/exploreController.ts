import { FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getAccessLimits } from '../middleware/auth';
import { PROVIDER_NAMES } from '../services/RegexRouter';


const querySchema = z.object({
  provider: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } }
};

const leakItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    provider: { type: 'string' },
    redactedKey: { type: 'string' },
    repoUrl: { type: 'string' },
    filePath: { type: 'string' },
    leakIntroducedAt: { type: 'string', format: 'date-time' },
    leakDetectedAt: { type: 'string', format: 'date-time' },
    repoCreatedAt: { type: 'string', format: 'date-time' },
    isLocked: { type: 'boolean' }
  }
};

export const getLeaksSchema = {
  querystring: {
    type: 'object',
    properties: {
      provider: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      page: { type: 'integer', minimum: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        leaks: { type: 'array', items: leakItemSchema },
        total: { type: 'number' },
        hasMore: { type: 'boolean' },
        planLimits: {
          type: 'object',
          properties: { maxLeaks: { type: 'number' } }
        }
      }
    },
    401: errorSchema,
    429: {
      type: 'object',
      properties: { error: { type: 'string' }, retryAfter: { type: 'number' } }
    }
  }
};

export const getLeakFullKeySchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: { redactedKey: { type: 'string' } }
    },
    401: errorSchema,
    403: {
      type: 'object',
      properties: { error: { type: 'string' }, upgradeRequired: { type: 'boolean' } }
    },
    404: errorSchema
  }
};

function buildQueryFilter(provider?: string): Record<string, any> {
  const filter: Record<string, any> = {};
  if (provider && provider !== 'all') {
    const normalized = provider.trim().toLowerCase();
    if (PROVIDER_NAMES.includes(normalized)) {
      filter['provider'] = normalized;
    }
  }
  return filter;
}

export async function getLeaksHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return reply.status(500).send({ error: 'Internal server error' });
    }

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }

    const { provider, limit, page } = parsed.data;
    const { isAuthenticated, id: userId } = request.user;
    const accessLimits = getAccessLimits(isAuthenticated);
    const enforcedLimit = Math.min(limit, accessLimits.maxLeaks);
    const enforcedPage = isAuthenticated ? page : 1;

    const filter = buildQueryFilter(provider);

    const sort = { leakIntroducedAt: -1 as const };

    let total = 0;
    let leaks: any[] = [];
    try {
      total = await Leak.countDocuments(filter);
      const skip = isAuthenticated ? (enforcedPage - 1) * enforcedLimit : 0;
      leaks = await Leak.find(filter)
        .select('redactedKey provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt')
        .sort(sort)
        .skip(skip)
        .limit(enforcedLimit)
        .lean();
    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    const mappedLeaks = leaks.map((l: any) => ({
      id: l._id,
      provider: l.provider,
      leakDetectedAt: l.leakDetectedAt,
      leakIntroducedAt: l.leakIntroducedAt,
      isLocked: false,
      redactedKey: l.redactedKey,
      repoUrl: l.repoUrl,
      filePath: l.filePath,
      repoCreatedAt: l.repoCreatedAt
    }));

    const hasMore = isAuthenticated &&
      (enforcedPage * enforcedLimit) < total &&
      (enforcedPage * enforcedLimit) < accessLimits.maxLeaks;

    request.log.info({ msg: 'Leaks accessed', userId, total, returned: mappedLeaks.length });

    return reply.send({
      leaks: mappedLeaks,
      total: total,
      hasMore,
      planLimits: { maxLeaks: accessLimits.maxLeaks }
    });
  } catch (error) {
    request.log.error('Error fetching leaks:', error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
}

export async function getLeakFullKeyHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user?.isAuthenticated) {
      return reply.status(403).send({ error: 'Full key access requires authentication' });
    }

    const { id } = request.params as { id: string };

    let leak = null;
    try {
      leak = await Leak.findById(id).select('redactedKey').lean();
    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    if (!leak) {
      return reply.status(404).send({ error: 'Leak not found' });
    }

    request.log.info({ msg: 'Full key accessed', userId: request.user.id, leakId: id });
    return reply.send({ redactedKey: leak.redactedKey });
  } catch (error) {
    request.log.error('Error fetching full key:', error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
}