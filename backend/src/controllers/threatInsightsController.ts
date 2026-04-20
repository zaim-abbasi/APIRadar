import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak as Exposure } from '../models/Leak';
import { ScannedRepo } from '../models/ScannedRepo';

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
  topProviders: {
    provider: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export const threatInsightsDataSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        totalReposScanned: { type: 'number' },
        totalLeaksFound: { type: 'number' },
        leaksFoundToday: { type: 'number' },
        topProviders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' },
              trend: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

export async function getThreatInsightsDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache<ThreatInsightsResponse>('threat-insights-summary', CACHE_TTL.SHORT, async () => {
      const [totalReposScanned, totalLeaksFound] = await Promise.all([
        ScannedRepo.countDocuments(),
        Exposure.countDocuments(),
      ]);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const leaksFoundToday = await Exposure.countDocuments({
        leakDetectedAt: { $gte: oneDayAgo }
      });

      const topProvidersRaw = await Exposure.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const topProviders = topProvidersRaw.map(p => ({
        provider: p._id,
        count: p.count,
        percentage: totalLeaksFound > 0 ? (p.count / totalLeaksFound) * 100 : 0,
        trend: 'stable' as const
      }));

      return { 
        totalReposScanned, 
        totalLeaksFound, 
        leaksFoundToday, 
        topProviders 
      };
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
    const data = await withCache<ActivityPoint[]>('threat-insights-activity-v2', CACHE_TTL.SHORT, async () => {
      const now = new Date();
      const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const thirteenDaysAgoStartUTC = new Date(todayStartUTC.getTime() - 13 * MS_PER_DAY);

      const raw = await Exposure.aggregate([
        { $match: { leakDetectedAt: { $gte: thirteenDaysAgoStartUTC } } },
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

      for (let i = 13; i >= 0; i--) {
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

export const exposureHoursSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        hours: {
          type: 'array',
          items: {
            type: 'object',
            properties: { hour: { type: 'number' }, count: { type: 'number' } }
          }
        },
        peakWindow: {
          type: 'object',
          properties: { start: { type: 'number' }, end: { type: 'number' } }
        },
        totalSamples: { type: 'number' }
      }
    }
  }
};

export async function getExposureHoursHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await withCache('exposure-hours', CACHE_TTL.LONG, async () => {
      const raw = await Exposure.aggregate([
        { $group: { _id: { $hour: '$leakIntroducedAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      const countMap = new Map(raw.map((r: any) => [r._id, r.count]));
      const hours = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: countMap.get(i) || 0
      }));

      const totalSamples = hours.reduce((sum, h) => sum + h.count, 0);

      let maxSum = 0;
      let peakStart = 0;
      for (let i = 0; i < 24; i++) {
        let windowSum = 0;
        for (let j = 0; j < 4; j++) {
          windowSum += hours[(i + j) % 24]!.count;
        }
        if (windowSum > maxSum) {
          maxSum = windowSum;
          peakStart = i;
        }
      }

      return { hours, peakWindow: { start: peakStart, end: (peakStart + 4) % 24 }, totalSamples };
    }, request.log);
    return reply.send(data);
  } catch (error) {
    request.log.error({ msg: 'Exposure hours fetch failed', error: String(error) });
    return reply.status(500).send({ error: 'Failed to fetch exposure hours' });
  }
}
