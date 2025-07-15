import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { ConfigurationService } from '../services/ConfigurationService';

// TypeScript interface for leaderboard response
interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  repositoryAgeCutoff: string | null;
  topProviders: { provider: string; count: number; percentage: number }[];
}

// Simple in-memory cache for leaderboard data
// For high scale, consider using a distributed cache like Redis
let leaderboardCache: LeaderboardResponse | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check cache first
    const now = Date.now();
    if (leaderboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return reply.send(leaderboardCache);
    }

    // Calculate start and end of day in Pakistan Standard Time (UTC+5)
    const nowUtc = new Date();
    // Offset in minutes for UTC+5
    const pkOffsetMinutes = 5 * 60;
    // Get current UTC+5 time
    const nowPk = new Date(nowUtc.getTime() + pkOffsetMinutes * 60 * 1000);
    // Start of day in PKT
    const startOfDayPk = new Date(nowPk);
    startOfDayPk.setHours(0, 0, 0, 0);
    // End of day in PKT
    const endOfDayPk = new Date(nowPk);
    endOfDayPk.setHours(23, 59, 59, 999);
    // const startOfDayUtc = new Date(startOfDayPk.getTime() - pkOffsetMinutes * 60 * 1000);
    // const endOfDayUtc = new Date(endOfDayPk.getTime() - pkOffsetMinutes * 60 * 1000);

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

    const response: LeaderboardResponse = {
      totalReposScanned,
      totalLeaksFound,
      repositoryAgeCutoff: repositoryAgeCutoff?.toISOString() ?? null,
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