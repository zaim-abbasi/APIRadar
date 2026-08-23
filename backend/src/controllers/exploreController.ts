import { FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getAccessLimits } from '../middleware/auth';
import { PROVIDER_NAMES } from '../services/RegexRouter';
import { Secret } from '../models/Secret';
import { decrypt, getEncryptionKey } from '../utils/encryption';


const querySchema = z.object({
  provider: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).max(10000).default(1),
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
    isLocked: { type: 'boolean' },
    originalUrl: { type: 'string' }
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

export const getProviderStatsSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          count: { type: 'number' },
          todayCount: { type: 'number' }
        }
      }
    },
    500: errorSchema
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
      properties: { fullKey: { type: 'string' } }
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

function redactString(s: string): string {
  if (s.length <= 5) return `${s.slice(0, 2)}${'*'.repeat(Math.max(3, Math.floor(s.length * 0.8)))}`;
  return `${s.slice(0, 3)}${'*'.repeat(Math.max(3, Math.floor((s.length - 5) * 0.8)))}${s.slice(-2)}`;
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
      total = (provider && provider !== 'all') 
        ? await Leak.countDocuments(filter)
        : await Leak.estimatedDocumentCount();
      const skip = isAuthenticated ? (enforcedPage - 1) * enforcedLimit : 0;
      leaks = await Leak.find(filter)
        .select('secretId provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt')
        .sort(sort)
        .skip(skip)
        .limit(enforcedLimit)
        .lean();

      // OPTIMIZATION: O(1) Batch Decryption Map
      const secretIds = [...new Set(leaks.map((l: any) => l.secretId.toString()))];
      const secrets = await Secret.find({ _id: { $in: secretIds } }).lean();

      const AES_KEY = getEncryptionKey();
      const secretMap = new Map(secrets.map(s => {
        let redacted = '**********';
        let full = '**********';
        try {
          full = decrypt(s.encryptedKey, AES_KEY);
          redacted = `${full.substring(0, 6)}********************${full.substring(full.length - 6)}`;
        } catch { }
        return [s._id.toString(), { redacted, full }];
      }));

      leaks = leaks.map((l: any) => {
        const secretData = secretMap.get(l.secretId.toString()) || { redacted: '**********', full: '**********' };
        
        const shouldRedact = !isAuthenticated;

        return {
          ...l,
          redactedKey: secretData.redacted,
          shouldRedact
        };
      });

    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    const mappedLeaks = leaks.map((l: any) => {
      let repoDisplay = '***';
      let fileDisplay = '***';
      if (l.repoUrl) {
        const m = l.repoUrl.match(/github\.com\/(.+?)\/(.+?)(?:$|\/|\?|#)/);
        if (m) {
          repoDisplay = l.shouldRedact ? `${redactString(m[1])}/${redactString(m[2])}` : `${m[1]}/${m[2]}`;
        } else {
          repoDisplay = l.shouldRedact ? '***' : l.repoUrl;
        }
      }
      if (l.filePath) {
        fileDisplay = l.shouldRedact
          ? l.filePath.split('/').map((p: string) => redactString(p)).join('/')
          : l.filePath;
      }
      return {
        id: l._id,
        provider: l.provider,
        leakDetectedAt: l.leakDetectedAt,
        leakIntroducedAt: l.leakIntroducedAt,
        isLocked: false,
        redactedKey: l.redactedKey,
        repoUrl: repoDisplay,
        filePath: fileDisplay,
        repoCreatedAt: l.repoCreatedAt,
        originalUrl: l.shouldRedact ? undefined : l.repoUrl
      };
    });

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

    let fullKey = '';
    try {
      const leak = await Leak.findById(id)
        .select('secretId')
        .populate<{ secretId: { encryptedKey?: string } }>('secretId', 'encryptedKey')
        .lean();

      if (leak?.secretId?.encryptedKey) {
        const AES_KEY = getEncryptionKey();
        fullKey = decrypt(leak.secretId.encryptedKey, AES_KEY);
      }
    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    if (!fullKey) {
      return reply.status(404).send({ error: 'Leak or Secret not found' });
    }

    request.log.info({ msg: 'Full key securely decrypted and accessed', userId: request.user.id, leakId: id });
    return reply.send({ fullKey });
  } catch (error) {
    request.log.error('Error fetching full key:', error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
}

export async function getProviderStatsHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await Leak.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          todayCount: {
            $sum: { $cond: [{ $gte: ['$leakDetectedAt', oneDayAgo] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Map _id to provider and fill any zero records if needed later down the pipeline
    const formattedStats = stats.map((s: any) => ({
      provider: s._id as string,
      count: s.count as number,
      todayCount: s.todayCount as number
    }));

    return reply.send(formattedStats);
  } catch (error) {
    request.log.error('Error fetching provider stats:', error);
    return reply.status(500).send({ error: 'Failed to fetch provider stats' });
  }
}