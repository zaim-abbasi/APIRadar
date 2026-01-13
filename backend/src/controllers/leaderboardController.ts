import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';

interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
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
    const [totalReposScanned, totalLeaksFound] = await Promise.all([
      ScanAttempt.countDocuments(),
      Leak.countDocuments(),
    ]);
    request.log.info({
      msg: 'Leaderboard query results',
      totalReposScanned,
      totalLeaksFound,
    });
    const leaksFoundToday = await Leak.countDocuments({
      leakDetectedAt: {
        $gte: twentyFourHoursAgo
      }
    });
    const response: LeaderboardResponse = {
      totalReposScanned,
      totalLeaksFound,
      leaksFoundToday,
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

type ActivityPoint = { date: string; count: number };

let activityCache: ActivityPoint[] | null = null;
let activityCacheTimestamp = 0;

export async function getLeaderboardActivityHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const now = Date.now();
    if (activityCache && (now - activityCacheTimestamp) < CACHE_DURATION) {
      request.log.info({ msg: 'Returning cached leaderboard activity', cacheAge: now - activityCacheTimestamp });
      return reply.send(activityCache);
    }

    const nowUtc = new Date();
    const todayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
    const startUtc = new Date(todayUtc.getTime() - 6 * 24 * 60 * 60 * 1000);

    const raw = await Leak.aggregate([
      { $match: { leakDetectedAt: { $gte: startUtc } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$leakDetectedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const counts = new Map<string, number>(
      raw.map((r: { _id: string; count: number }) => [r._id, r.count])
    );

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    const result: ActivityPoint[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startUtc.getTime() + i * 24 * 60 * 60 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      return { date: weekdays[d.getUTCDay()] ?? 'Sun', count: counts.get(key) || 0 };
    });

    activityCache = result;
    activityCacheTimestamp = now;
    return reply.send(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    request.log.error({
      msg: 'Leaderboard activity fetch failed',
      error: errorMessage,
      stack: errorStack,
      errorObject: error,
    });

    return reply.status(500).send({
      error: 'Failed to fetch leaderboard activity',
      details: process.env['NODE_ENV'] === 'development' ? errorMessage : undefined,
    });
  }
}