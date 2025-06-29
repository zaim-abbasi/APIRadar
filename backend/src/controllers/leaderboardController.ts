import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { ConfigurationService } from '../services/ConfigurationService';

// Simple in-memory cache for leaderboard data
let leaderboardCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check cache first
    const now = Date.now();
    if (leaderboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return reply.send(leaderboardCache);
    }

    // Fetch all leaderboard data in parallel for better performance
    const [totalReposScanned, totalLeaksFound, repositoryAgeCutoff, topProviders] = await Promise.all([
      ScanAttempt.countDocuments().lean(),
      Leak.countDocuments().lean(),
      ConfigurationService.getRepositoryAgeCutoff(),
      Leak.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calculate percentages for top providers
    const providersWithPercentage = topProviders.map((provider: { _id: string; count: number }) => ({
      provider: provider._id,
      count: provider.count,
      percentage: totalLeaksFound > 0 ? (provider.count / totalLeaksFound) * 100 : 0
    }));

    const response = {
      totalReposScanned,
      totalLeaksFound,
      repositoryAgeCutoff: repositoryAgeCutoff?.toISOString(),
      topProviders: providersWithPercentage
    };

    // Cache the response
    leaderboardCache = response;
    cacheTimestamp = now;

    return reply.send(response);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaderboard data' });
  }
} 