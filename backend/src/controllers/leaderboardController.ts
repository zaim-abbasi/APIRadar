import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';

// TypeScript interface for leaderboard response
interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
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
      request.log.info({ msg: 'Returning cached leaderboard data', cacheAge: now - cacheTimestamp });
      return reply.send(leaderboardCache);
    }

    // Calculate leaks found in the last 24 hours (more intuitive than "today in a specific timezone")
    const nowUtc = new Date();
    const twentyFourHoursAgo = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);

    // Query database for counts and top providers
    // Note: countDocuments() returns a number, not a document, so we don't use .lean()
    const [totalReposScanned, totalLeaksFound, topProviders] = await Promise.all([
      ScanAttempt.countDocuments(),
      Leak.countDocuments(),
      Leak.aggregate([
        { $match: { $and: [{ provider: { $exists: true } }, { provider: { $ne: null } }, { provider: { $ne: '' } }] } }, // Only count leaks with valid providers
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Log for debugging
    request.log.info({
      msg: 'Leaderboard query results',
      totalReposScanned,
      totalLeaksFound,
      topProvidersCount: topProviders?.length || 0,
      topProviders: topProviders?.slice(0, 3) // Log first 3 for debugging
    });

    // Calculate percentages for top providers
    const providersWithPercentage = (topProviders || []).map((provider: { _id: string; count: number }) => ({
      provider: provider._id,
      count: provider.count,
      percentage: totalLeaksFound > 0 ? (provider.count / totalLeaksFound) * 100 : 0
    }));

    // Calculate leaks found in the last 24 hours
    const leaksFoundToday = await Leak.countDocuments({
      leakDetectedAt: {
        $gte: twentyFourHoursAgo
      }
    });

    // Comment out repositoryAgeCutoff in response
    const response: LeaderboardResponse = {
      totalReposScanned,
      totalLeaksFound,
      leaksFoundToday,
      topProviders: providersWithPercentage
    };

    // Only cache if we have data (don't cache zeros from empty database)
    // This prevents caching a "no data" state that might persist
    if (totalLeaksFound > 0 || totalReposScanned > 0) {
      leaderboardCache = response;
      cacheTimestamp = now;
    } else {
      // Clear cache if database is empty (might be initial state)
      leaderboardCache = null;
      request.log.warn({ msg: 'Leaderboard database appears empty, cache cleared' });
    }

    return reply.send(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    request.log.error({
      msg: 'Leaderboard data fetch failed',
      error: errorMessage,
      stack: errorStack,
      errorObject: error
    });
    
    return reply.status(500).send({ 
      error: 'Failed to fetch leaderboard data',
      details: process.env['NODE_ENV'] === 'development' ? errorMessage : undefined
    });
  }
} 