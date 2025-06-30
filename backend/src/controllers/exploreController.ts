import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';

const querySchema = z.object({
  provider: z.string().optional(),
  timeRange: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export async function getLeaksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }
    const { provider, timeRange, sortBy, limit, page } = parsed.data;
    const filter: any = {};
    if (provider && provider !== 'all') filter.provider = provider;
    if (timeRange) {
      const now = new Date();
      let days = 0;
      if (timeRange === '7d') days = 7;
      else if (timeRange === '15d') days = 15;
      else if (timeRange === '30d') days = 30;
      if (days > 0) {
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filter.leakIntroducedAt = { $gte: fromDate };
      }
    }
    let sort: any = { leakIntroducedAt: -1 };
    if (sortBy === 'oldest') sort = { leakIntroducedAt: 1 };
    else if (sortBy === 'provider') sort = { provider: 1, leakIntroducedAt: -1 };
    // You can add more sort options if needed
    const total = await Leak.countDocuments(filter);
    const leaks = await Leak.find(filter)
      .select('+fullKey redactedKey provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    // Map fields to camelCase for frontend
    const mappedLeaks = leaks.map((leak: any) => ({
      id: leak.id || leak._id,
      redactedKey: leak.redactedKey,
      provider: leak.provider,
      repoUrl: leak.repoUrl,
      filePath: leak.filePath,
      fullKey: leak.fullKey,
      leakDetectedAt: leak.leakDetectedAt,
      leakIntroducedAt: leak.leakIntroducedAt,
      repoCreatedAt: leak.repoCreatedAt,
    }));
    return reply.send({ leaks: mappedLeaks, total, hasMore: page * limit < total });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
}

export async function getLeakFullKeyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  try {
    const leak = await Leak.findById(id).select('+fullKey');
    if (!leak) {
      return reply.status(404).send({ error: 'Leak not found' });
    }
    return reply.send({ fullKey: leak.fullKey });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
} 