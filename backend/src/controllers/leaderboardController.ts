import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { ConfigurationService } from '../services/ConfigurationService';

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Fetch all leaderboard data in parallel for better performance
    const [totalReposScanned, totalLeaksFound, repositoryAgeCutoff, topProviders] = await Promise.all([
      ScanAttempt.countDocuments(),
      Leak.countDocuments(),
      ConfigurationService.getRepositoryAgeCutoff(),
      Leak.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calculate percentages for top providers
    const providersWithPercentage = topProviders.map(provider => ({
      provider: provider._id,
      count: provider.count,
      percentage: totalLeaksFound > 0 ? (provider.count / totalLeaksFound) * 100 : 0
    }));

    return reply.send({
      totalReposScanned,
      totalLeaksFound,
      repositoryAgeCutoff: repositoryAgeCutoff?.toISOString(),
      topProviders: providersWithPercentage
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaderboard data' });
  }
} 