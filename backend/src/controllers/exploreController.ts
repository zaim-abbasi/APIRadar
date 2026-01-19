import { FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getAccessLimits } from '../middleware/auth';
import { PROVIDER_NAMES, TIME_RANGE_DAYS } from '../services/RegexRouter';

const MS_PER_DAY = 86400000;

const querySchema = z.object({
  provider: z.string().optional(),
  timeRange: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

function buildQueryFilter(provider?: string, timeRange?: string): Record<string, any> {
  const filter: Record<string, any> = {};
  if (provider && provider !== 'all') {
    const normalized = provider.trim().toLowerCase();
    if (PROVIDER_NAMES.includes(normalized)) {
      filter['provider'] = normalized;
    }
  }
  const days = TIME_RANGE_DAYS[timeRange || ''];
  if (days) {
    filter['leakIntroducedAt'] = { $gte: new Date(Date.now() - days * MS_PER_DAY) };
  }
  return filter;
}

function buildSort(sortBy?: string): Record<string, 1 | -1> {
  if (sortBy === 'oldest') return { leakIntroducedAt: 1 };
  if (sortBy === 'provider') return { provider: 1, leakIntroducedAt: -1 };
  return { leakIntroducedAt: -1 };
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

    const { provider, timeRange, sortBy, limit, page } = parsed.data;
    const { isAuthenticated, id: userId } = request.user;
    const accessLimits = getAccessLimits(isAuthenticated);
    const enforcedLimit = Math.min(limit, accessLimits.maxLeaks);
    const enforcedPage = isAuthenticated ? page : 1;

    const filter = buildQueryFilter(provider, timeRange);
    const sort = buildSort(sortBy);

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

    const hasMore = isAuthenticated && (enforcedPage * enforcedLimit) < total;

    request.log.info({ msg: 'Leaks accessed', userId, total, returned: mappedLeaks.length });

    return reply.send({
      leaks: mappedLeaks,
      total,
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