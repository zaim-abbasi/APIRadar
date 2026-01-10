import { FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getAccessLimits } from '../middleware/auth';

const querySchema = z.object({
  provider: z.string().optional(),
  timeRange: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export async function getLeaksHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      request.log.warn({ msg: 'Request user not set by middleware', ip: request.ip });
      return reply.status(500).send({ error: 'Internal server error' });
    }

    const user = request.user;
    const isAuthenticated = user.isAuthenticated;

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }

    const { provider, timeRange, sortBy, limit, page } = parsed.data;
    const accessLimits = getAccessLimits(isAuthenticated);
    let enforcedLimit = Math.min(limit, accessLimits.maxLeaks);
    let enforcedPage = accessLimits.canInfiniteScroll ? page : 1;
    if (!isAuthenticated) {
      enforcedLimit = Math.min(enforcedLimit, 6);
      enforcedPage = 1;
    }
    let enforcedTimeRange = timeRange;
    const filter: any = {};
    const validProviders = ['ai-key', 'mistral-ai', 'cohere', 'huggingface'];
    if (provider && provider !== 'all') {
      const normalizedProvider = String(provider).trim().toLowerCase();
      if (validProviders.includes(normalizedProvider)) {
        filter.provider = normalizedProvider;
      } else {
        request.log.warn({ msg: 'Invalid provider requested; treating as no filter', provider: normalizedProvider, userId: user.id });
        // Do not filter by provider if unknown, just show all.
      }
    }
    if (enforcedTimeRange && enforcedTimeRange !== 'all') {
      const now = new Date();
      let days = 0;
      if (enforcedTimeRange === '7d') days = 7;
      else if (enforcedTimeRange === '15d') days = 15;
      else if (enforcedTimeRange === '30d') days = 30;
      if (days > 0) {
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filter.leakIntroducedAt = { $gte: fromDate };
      }
    }
    let sort: any = { leakIntroducedAt: -1 };
    if (sortBy === 'oldest') sort = { leakIntroducedAt: 1 };
    else if (sortBy === 'provider') sort = { provider: 1, leakIntroducedAt: -1 };
    request.log.info({ 
      msg: 'Leak filter applied', 
      filter, 
      provider, 
      normalizedProvider: provider ? String(provider).trim().toLowerCase() : 'all',
      userId: user.id 
    });
    let total = 0;
    let leaks: any[] = [];
    try {
      const poolState = typeof require('mongoose').connection?.readyState !== 'undefined' ? require('mongoose').connection.readyState : 'unknown';
      request.log.info({
        msg: 'LEAKS QUERY', filter, poolState, limit: enforcedLimit, page: enforcedPage, connectionState: poolState });
      total = await Leak.countDocuments(filter);
      const skip = accessLimits.canInfiniteScroll ? (enforcedPage - 1) * enforcedLimit : 0;
      const actualLimit = accessLimits.canInfiniteScroll ? enforcedLimit : accessLimits.maxLeaks;
      leaks = await Leak.find(filter)
        .select('redactedKey provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt')
        .sort(sort)
        .skip(skip)
        .limit(actualLimit)
        .lean();
      request.log.info({ msg: 'LEAKS QUERY RESULT', rowCount: leaks.length });
    } catch (dbErr) {
      request.log.error({ msg: 'DB error in getLeaksHandler', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }
    if (filter.provider) {
      const mismatched = leaks.filter((leak: any) => leak.provider !== filter.provider);
      if (mismatched.length > 0) {
        request.log.error({ 
          msg: 'Filter mismatch detected', 
          expectedProvider: filter.provider, 
          mismatchedCount: mismatched.length,
          sampleMismatched: mismatched.slice(0, 3).map((l: any) => ({ id: l.id, provider: l.provider }))
        });
      }
    }
    const mappedLeaks = leaks.map((leak: any) => {
      return {
        id: leak.id || leak._id,
        provider: leak.provider,
        leakDetectedAt: leak.leakDetectedAt,
        leakIntroducedAt: leak.leakIntroducedAt,
        isLocked: false,
        redactedKey: leak.redactedKey,
        repoUrl: leak.repoUrl,
        filePath: leak.filePath,
        repoCreatedAt: leak.repoCreatedAt
      };
    });
    let hasMore = false;
    if (accessLimits.canInfiniteScroll && isAuthenticated) {
      hasMore = (enforcedPage * enforcedLimit) < total;
    }
    request.log.info({
      msg: 'Leaks accessed',
      userId: user.id,
      isAuthenticated: isAuthenticated,
      requestedLimit: limit,
      enforcedLimit: enforcedLimit,
      requestedPage: page,
      enforcedPage: enforcedPage,
      totalResults: total,
      returnedResults: mappedLeaks.length,
      hasMore,
      ip: request.ip
    });

    return reply.send({ 
      leaks: mappedLeaks, 
      total,
      hasMore,
      planLimits: {
        maxLeaks: accessLimits.maxLeaks,
        canInfiniteScroll: accessLimits.canInfiniteScroll,
        maxTimeRange: accessLimits.maxTimeRange
      }
    });

  } catch (error) {
    request.log.error('Error fetching leaks:', error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
}

export async function getLeakFullKeyHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const user = request.user;
    const accessLimits = getAccessLimits(user.isAuthenticated);
    if (!accessLimits.canAccessFullKey || !user.isAuthenticated) {
      request.log.warn({
        msg: 'Unauthorized full key access attempt',
        userId: user.id,
        leakId: id,
        ip: request.ip
      });
      return reply.status(403).send({ 
        error: 'Full key access is disabled. Only redacted keys are available.'
      });
    }
    let leak = null;
    try {
      leak = await Leak.findById(id).lean();
    } catch (dbErr) {
      request.log.error({ msg: 'DB error in getLeakFullKeyHandler', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }
    if (!leak) {
      return reply.status(404).send({ error: 'Leak not found' });
    }
    request.log.info({
      msg: 'Full key accessed',
      userId: user.id,
      leakId: id,
      ip: request.ip
    });

    return reply.send({ redactedKey: leak.redactedKey });

  } catch (error) {
    request.log.error('Error fetching full key:', error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
} 