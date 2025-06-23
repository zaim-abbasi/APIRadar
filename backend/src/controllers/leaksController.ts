import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';

const querySchema = z.object({
  provider: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export async function getLeaksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }
    const { provider, limit, page } = parsed.data;
    const filter: any = {};
    if (provider) filter.provider = provider;
    const total = await Leak.countDocuments(filter);
    const leaks = await Leak.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return reply.send({ leaks, total, hasMore: page * limit < total });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
} 