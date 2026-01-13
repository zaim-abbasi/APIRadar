import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { githubService } from '../services/github';

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

type TopLeaker = {
  rank: number;
  username: string;
  avatar_url: string;
  html_url: string;
  total_leaks: number;
  repos_count: number;
};

let topLeakersCache: TopLeaker[] | null = null;
let topLeakersCacheTimestamp = 0;
const TOP_LEAKERS_CACHE_DURATION = 5 * 60 * 1000;
const TOP_LEAKERS_LIMIT = 10;

export async function getTopLeakersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const now = Date.now();
    if (topLeakersCache && (now - topLeakersCacheTimestamp) < TOP_LEAKERS_CACHE_DURATION) {
      request.log.info({ msg: 'Returning cached top leakers', cacheAge: now - topLeakersCacheTimestamp });
      return reply.send(topLeakersCache);
    }

    const raw = await Leak.aggregate([
      {
        $addFields: {
          _m: { $regexFind: { input: '$repoUrl', regex: /github\.com\/([^\/]+)\/([^\/?#]+)/ } },
        },
      },
      {
        $addFields: {
          owner: { $ifNull: [{ $arrayElemAt: ['$_m.captures', 0] }, ''] },
        },
      },
      { $match: { owner: { $ne: '' } } },
      { $project: { owner: 1, fullKey: 1, repoUrl: 1 } },
      { $group: { _id: { owner: '$owner', key: '$fullKey' }, repoUrl: { $first: '$repoUrl' } } },
      { $group: { _id: '$_id.owner', total_leaks: { $sum: 1 }, repos: { $addToSet: '$repoUrl' } } },
      { $project: { _id: 0, username: '$_id', total_leaks: 1, repos_count: { $size: '$repos' } } },
      { $sort: { total_leaks: -1 } },
      { $limit: TOP_LEAKERS_LIMIT },
    ]);

    const usernames = raw
      .map((r: any) => (typeof r?.username === 'string' ? r.username : ''))
      .filter((u: string) => u.length > 0);

    const profiles = await Promise.all(
      usernames.map(async (username: string) => {
        const profile = await githubService.getUserProfile(username);
        return { username, profile };
      })
    );

    const profileMap = new Map(
      profiles.map(({ username, profile }) => [
        username,
        {
          login: profile?.login || username,
          avatar_url: profile?.avatar_url || '',
          html_url: profile?.html_url || `https://github.com/${username}`,
        },
      ])
    );

    const result: TopLeaker[] = raw.map((row: any, idx: number) => {
      const username = typeof row?.username === 'string' ? row.username : '';
      const total_leaks = typeof row?.total_leaks === 'number' ? row.total_leaks : 0;
      const repos_count = typeof row?.repos_count === 'number' ? row.repos_count : 0;
      const p = profileMap.get(username);
      return {
        rank: idx + 1,
        username: p?.login || username,
        avatar_url: p?.avatar_url || '',
        html_url: p?.html_url || `https://github.com/${username}`,
        total_leaks,
        repos_count,
      };
    });

    topLeakersCache = result;
    topLeakersCacheTimestamp = now;
    return reply.send(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    request.log.error({
      msg: 'Top leakers fetch failed',
      error: errorMessage,
      stack: errorStack,
      errorObject: error,
    });

    return reply.status(500).send({
      error: 'Failed to fetch top leakers',
      details: process.env['NODE_ENV'] === 'development' ? errorMessage : undefined,
    });
  }
}