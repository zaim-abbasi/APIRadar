import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { githubService } from '../services/github';

const MS_PER_DAY = 86_400_000;
const ACTIVITY_DAYS = 7;
const CACHE_TTL = { SHORT: 30_000, LONG: 300_000 };

const cache = new Map<string, { data: any; timestamp: number }>();

function resolveTimezone(tz?: string): string {
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>, log: any): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < ttl) {
    log.info({ msg: 'Cache hit', key, age: now - cached.timestamp });
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

function formatLocalDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

interface LeaderboardResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
}

export const leaderboardDataSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        totalReposScanned: { type: 'number' },
        totalLeaksFound: { type: 'number' },
        leaksFoundToday: { type: 'number' }
      }
    }
  }
};

export async function getLeaderboardDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tz = resolveTimezone((request.query as any).timezone);
    const data = await withCache<LeaderboardResponse>(`leaderboard-${tz}`, CACHE_TTL.SHORT, async () => {
      const [totalReposScanned, totalLeaksFound] = await Promise.all([
        ScanAttempt.countDocuments(),
        Leak.countDocuments(),
      ]);
      const result = await Leak.aggregate([
        { $project: { localDate: { $dateToString: { format: '%Y-%m-%d', date: '$leakDetectedAt', timezone: tz } } } },
        { $match: { localDate: formatLocalDate(new Date(), tz) } },
        { $count: 'count' }
      ]);
      return { totalReposScanned, totalLeaksFound, leaksFoundToday: result[0]?.count || 0 };
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Leaderboard fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch leaderboard data' });
  }
}

type ActivityPoint = { date: string; count: number };

export const activitySchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          count: { type: 'number' }
        }
      }
    }
  }
};

export async function getLeaderboardActivityHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tz = resolveTimezone((request.query as any).timezone);
    const data = await withCache<ActivityPoint[]>(`activity-${tz}`, CACHE_TTL.SHORT, async () => {
      const now = Date.now();
      const raw = await Leak.aggregate([
        { $match: { leakDetectedAt: { $gte: new Date(now - (ACTIVITY_DAYS + 1) * MS_PER_DAY) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$leakDetectedAt', timezone: tz } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const counts = new Map(raw.map((r: any) => [r._id, r.count]));
      const result: ActivityPoint[] = [];
      for (let i = ACTIVITY_DAYS; i >= 1; i--) {
        const t = new Date(now - i * MS_PER_DAY);
        const dateKey = formatLocalDate(t, tz);
        const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(t);
        result.push({ date: dayName, count: counts.get(dateKey) || 0 });
      }
      return result;
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Activity fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch leaderboard activity' });
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

export const topLeakersSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'number' },
          username: { type: 'string' },
          avatar_url: { type: 'string' },
          html_url: { type: 'string' },
          total_leaks: { type: 'number' },
          repos_count: { type: 'number' }
        }
      }
    }
  }
};

const TOP_LEAKERS_LIMIT = 10;

export async function getTopLeakersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache<TopLeaker[]>('top-leakers', CACHE_TTL.LONG, async () => {
      const raw = await Leak.aggregate([
        { $addFields: { owner: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ['$repoUrl', 'github.com/'] }, 1] }, '/'] }, 0] } } },
        { $match: { owner: { $nin: [null, ''] } } },
        { $group: { _id: { owner: '$owner', key: '$fullKey' }, repoUrl: { $first: '$repoUrl' } } },
        { $group: { _id: '$_id.owner', total_leaks: { $sum: 1 }, repos: { $addToSet: '$repoUrl' } } },
        { $project: { _id: 0, username: '$_id', total_leaks: 1, repos_count: { $size: '$repos' } } },
        { $sort: { total_leaks: -1 } },
        { $limit: TOP_LEAKERS_LIMIT }
      ]);

      const profiles = await Promise.all(
        raw.filter((r: any) => r.username).map(async (r: any) => {
          const profile = await githubService.getUserProfile(r.username);
          return { username: r.username, profile };
        })
      );
      const profileMap = new Map(profiles.map(({ username, profile }) => [
        username,
        { login: profile?.login || username, avatar_url: profile?.avatar_url || '', html_url: profile?.html_url || `https://github.com/${username}` }
      ]));

      return raw.map((row: any, idx: number) => {
        const p = profileMap.get(row.username);
        return {
          rank: idx + 1,
          username: p?.login || row.username,
          avatar_url: p?.avatar_url || '',
          html_url: p?.html_url || `https://github.com/${row.username}`,
          total_leaks: row.total_leaks || 0,
          repos_count: row.repos_count || 0
        };
      });
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Top leakers fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch top leakers' });
  }
}