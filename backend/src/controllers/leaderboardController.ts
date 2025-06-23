import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';

export async function getLeaderboardHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const leaderboard = await Leak.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return reply.send({ leaderboard });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
  }
} 