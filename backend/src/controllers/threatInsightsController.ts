import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak as Exposure } from '../models/Leak';
import { ScannedRepo } from '../models/ScannedRepo';
import { githubService } from '../services/github';

const MS_PER_DAY = 86_400_000;

const CACHE_TTL = { SHORT: 30_000, LONG: 300_000 };

const cache = new Map<string, { data: any; timestamp: number }>();

function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>, log: any): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < ttl) {
    log.info({ msg: 'Cache hit', key, age: now - cached.timestamp });
    return cached.data;
  }
  const data = fetcher();
  if (data instanceof Promise) {
    return data.then(d => {
      cache.set(key, { data: d, timestamp: now });
      return d;
    });
  }
  cache.set(key, { data, timestamp: now });
  return Promise.resolve(data);
}

interface ThreatInsightsResponse {
  totalReposScanned: number;
  totalLeaksFound: number;
  leaksFoundToday: number;
}

export const threatInsightsDataSchema = {
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

export async function getThreatInsightsDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache<ThreatInsightsResponse>('threat-insights-global', CACHE_TTL.SHORT, async () => {
      const [totalReposScanned, totalLeaksFound] = await Promise.all([
        ScannedRepo.countDocuments(),
        Exposure.countDocuments(),
      ]);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const leaksFoundToday = await Exposure.countDocuments({
        leakDetectedAt: { $gte: oneDayAgo }
      });

      return { totalReposScanned, totalLeaksFound, leaksFoundToday };
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Threat Insights fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch threat insights data' });
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

export async function getThreatInsightsActivityHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache<ActivityPoint[]>('threat-insights-activity', CACHE_TTL.SHORT, async () => {
      const now = new Date();
      const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const sixDaysAgoStartUTC = new Date(todayStartUTC.getTime() - 6 * MS_PER_DAY);

      const raw = await Exposure.aggregate([
        { $match: { leakDetectedAt: { $gte: sixDaysAgoStartUTC } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$leakDetectedAt', timezone: 'UTC' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const counts = new Map(raw.map((r: any) => [r._id, r.count]));
      const result: ActivityPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const t = new Date(todayStartUTC.getTime() - i * MS_PER_DAY);
        const dateKey = t.toISOString().split('T')[0];
        const dayName = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(t);
        result.push({ date: dayName, count: counts.get(dateKey) || 0 });
      }
      return result;
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Activity fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch exposure activity' });
  }
}

type TopExposureUser = {
  rank: number;
  username: string;
  avatar_url: string;
  html_url: string;
  total_leaks: number;
  repos_count: number;
};

export const topExposuresSchema = {
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

const TOP_EXPOSURES_LIMIT = 10;

export async function getTopExposuresHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache<TopExposureUser[]>('top-exposures', CACHE_TTL.LONG, async () => {
      const raw = await Exposure.aggregate([
        { $addFields: { owner: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ['$repoUrl', 'github.com/'] }, 1] }, '/'] }, 0] } } },
        { $match: { owner: { $nin: [null, ''] }, secretId: { $exists: true } } },
        { $group: { _id: { owner: '$owner', key: '$secretId' }, repoUrl: { $first: '$repoUrl' } } },
        { $group: { _id: '$_id.owner', total_leaks: { $sum: 1 }, repos: { $addToSet: '$repoUrl' } } },
        { $project: { _id: 0, username: '$_id', total_leaks: 1, repos_count: { $size: '$repos' } } },
        { $sort: { total_leaks: -1 } },
        { $limit: TOP_EXPOSURES_LIMIT }
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
    request.log.error({ msg: 'Top exposures fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch top exposures' });
  }
}