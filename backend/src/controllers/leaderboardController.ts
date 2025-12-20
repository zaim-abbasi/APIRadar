import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';

interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
  topProviders: { provider: string; count: number; percentage: number }[];
}

let leaderboardCache: LeaderboardResponse | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const now = Date.now();
    if (leaderboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
      request.log.info({ msg: 'Returning cached leaderboard data', cacheAge: now - cacheTimestamp });
      return reply.send(leaderboardCache);
    }
    const nowUtc = new Date();
    const twentyFourHoursAgo = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
    const [totalReposScanned, totalLeaksFound, topProviders] = await Promise.all([
      ScanAttempt.countDocuments(),
      Leak.countDocuments(),
      Leak.aggregate([
        { $match: { $and: [{ provider: { $exists: true } }, { provider: { $ne: null } }, { provider: { $ne: '' } }] } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    request.log.info({
      msg: 'Leaderboard query results',
      totalReposScanned,
      totalLeaksFound,
      topProvidersCount: topProviders?.length || 0,
      topProviders: topProviders?.slice(0, 3)
    });
    const providersWithPercentage = (topProviders || []).map((provider: { _id: string; count: number }) => ({
      provider: provider._id,
      count: provider.count,
      percentage: totalLeaksFound > 0 ? (provider.count / totalLeaksFound) * 100 : 0
    }));
    const leaksFoundToday = await Leak.countDocuments({
      leakDetectedAt: {
        $gte: twentyFourHoursAgo
      }
    });
    const response: LeaderboardResponse = {
      totalReposScanned,
      totalLeaksFound,
      leaksFoundToday,
      topProviders: providersWithPercentage
    };
    if (totalLeaksFound > 0 || totalReposScanned > 0) {
      leaderboardCache = response;
      cacheTimestamp = now;
    } else {
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