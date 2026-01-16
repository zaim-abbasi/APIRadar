import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { githubService } from '../services/github';

interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
}

const CACHE_DURATION = 30 * 1000;

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { timezone } = request.query as { timezone?: string };
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const targetTimezone = timezone || systemTimezone || 'UTC';

    const now = Date.now();
    const cacheKey = `leaderboard-${targetTimezone}`;

    if (cacheMap.has(cacheKey)) {
      const cached = cacheMap.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        request.log.info({ msg: 'Returning cached leaderboard data', cacheAge: now - cached.timestamp, timezone: targetTimezone });
        return reply.send(cached.data);
      }
    }

    const [totalReposScanned, totalLeaksFound] = await Promise.all([
      ScanAttempt.countDocuments(),
      Leak.countDocuments(),
    ]);

    let leaksFoundToday = 0;

    const result = await Leak.aggregate([
      {
        $project: {
          localDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$leakDetectedAt",
              timezone: targetTimezone
            }
          }
        }
      },
      {
        $match: {
          localDate: new Intl.DateTimeFormat('en-CA', {
            timeZone: targetTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(new Date())
        }
      },
      {
        $count: "count"
      }
    ]);
    leaksFoundToday = result[0]?.count || 0;

    const response: LeaderboardResponse = {
      totalReposScanned,
      totalLeaksFound,
      leaksFoundToday,
    };

    cacheMap.set(cacheKey, { data: response, timestamp: now });

    return reply.send(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error({ msg: 'Leaderboard data fetch failed', error: errorMessage });
    return reply.status(500).send({ error: 'Failed to fetch leaderboard data' });
  }
}

const cacheMap = new Map<string, { data: any, timestamp: number }>();
const activityCacheMap = new Map<string, { data: any, timestamp: number }>();

type ActivityPoint = { date: string; count: number };

export async function getLeaderboardActivityHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { timezone } = request.query as { timezone?: string };
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const targetTimezone = timezone || systemTimezone || 'UTC';

    const now = Date.now();
    const cacheKey = `activity-${targetTimezone}`;

    if (activityCacheMap.has(cacheKey)) {
      const cached = activityCacheMap.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        request.log.info({ msg: 'Returning cached leaderboard activity', cacheAge: now - cached.timestamp, timezone: targetTimezone });
        return reply.send(cached.data);
      }
    }

    const tz = targetTimezone;

    const nowUtc = new Date();
    const sevenDaysAgoUtc = new Date(nowUtc.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days buffer

    const raw = await Leak.aggregate([
      { $match: { leakDetectedAt: { $gte: sevenDaysAgoUtc } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$leakDetectedAt', timezone: tz } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const counts = new Map<string, number>(
      raw.map((r: { _id: string; count: number }) => [r._id, r.count])
    );

    const result: ActivityPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const t = new Date(now - i * 24 * 60 * 60 * 1000);

      const dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(t);

      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short'
      }).format(t);

      result.push({
        date: dayName,
        count: counts.get(dateKey) || 0
      });
    }

    activityCacheMap.set(cacheKey, { data: result, timestamp: now });
    return reply.send(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error({
      msg: 'Leaderboard activity fetch failed',
      error: errorMessage,
    });
    return reply.status(500).send({
      error: 'Failed to fetch leaderboard activity',
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