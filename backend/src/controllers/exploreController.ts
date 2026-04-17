import { FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getAccessLimits } from '../middleware/auth';
import { PROVIDER_NAMES } from '../services/RegexRouter';
import { Secret } from '../models/Secret';
import { decrypt, getEncryptionKey } from '../utils/encryption';


const querySchema = z.object({
  provider: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } }
};

const leakItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    provider: { type: 'string' },
    redactedKey: { type: 'string' },
    repoUrl: { type: 'string' },
    filePath: { type: 'string' },
    leakIntroducedAt: { type: 'string', format: 'date-time' },
    leakDetectedAt: { type: 'string', format: 'date-time' },
    repoCreatedAt: { type: 'string', format: 'date-time' },
    isLocked: { type: 'boolean' }
  }
};

export const getLeaksSchema = {
  querystring: {
    type: 'object',
    properties: {
      provider: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      page: { type: 'integer', minimum: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        leaks: { type: 'array', items: leakItemSchema },
        total: { type: 'number' },
        hasMore: { type: 'boolean' },
        planLimits: {
          type: 'object',
          properties: { maxLeaks: { type: 'number' } }
        }
      }
    },
    401: errorSchema,
    429: {
      type: 'object',
      properties: { error: { type: 'string' }, retryAfter: { type: 'number' } }
    }
  }
};

export const getProviderStatsSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          count: { type: 'number' },
          todayCount: { type: 'number' }
        }
      }
    },
    500: errorSchema
  }
};

export const getLiveStatsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        activeResearchers: { type: 'number' }
      }
    }
  }
};

export const getLeakFullKeySchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: { fullKey: { type: 'string' } }
    },
    401: errorSchema,
    403: {
      type: 'object',
      properties: { error: { type: 'string' }, upgradeRequired: { type: 'boolean' } }
    },
    404: errorSchema
  }
};

function buildQueryFilter(provider?: string): Record<string, any> {
  const filter: Record<string, any> = {};
  if (provider && provider !== 'all') {
    const normalized = provider.trim().toLowerCase();
    if (PROVIDER_NAMES.includes(normalized)) {
      filter['provider'] = normalized;
    }
  }
  return filter;
}

export async function getLeaksHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return reply.status(500).send({ error: 'Internal server error' });
    }

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }

    const { provider, limit, page } = parsed.data;
    const { isAuthenticated, id: userId } = request.user;
    const accessLimits = getAccessLimits(isAuthenticated);
    const enforcedLimit = Math.min(limit, accessLimits.maxLeaks);
    const enforcedPage = isAuthenticated ? page : 1;

    const filter = buildQueryFilter(provider);

    const sort = { leakIntroducedAt: -1 as const };

    let total = 0;
    let leaks: any[] = [];
    try {
      total = await Leak.countDocuments(filter);
      const skip = isAuthenticated ? (enforcedPage - 1) * enforcedLimit : 0;
      leaks = await Leak.find(filter)
        .select('secretId provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt')
        .sort(sort)
        .skip(skip)
        .limit(enforcedLimit)
        .lean();

      // OPTIMIZATION: O(1) Batch Decryption Map
      const secretIds = [...new Set(leaks.map(l => l.secretId.toString()))];
      const secrets = await Secret.find({ _id: { $in: secretIds } }).lean();

      const AES_KEY = getEncryptionKey();
      const secretMap = new Map(secrets.map(s => {
        let redacted = '**********';
        try {
          const full = decrypt(s.encryptedKey, AES_KEY);
          redacted = `${full.substring(0, 6)}********************${full.substring(full.length - 6)}`;
        } catch { }
        return [s._id.toString(), redacted];
      }));

      leaks = leaks.map(l => ({
        ...l,
        redactedKey: secretMap.get(l.secretId.toString()) || '**********'
      }));

    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    const mappedLeaks = leaks.map((l: any) => ({
      id: l._id,
      provider: l.provider,
      leakDetectedAt: l.leakDetectedAt,
      leakIntroducedAt: l.leakIntroducedAt,
      isLocked: false,
      redactedKey: l.redactedKey,
      repoUrl: l.repoUrl,
      filePath: l.filePath,
      repoCreatedAt: l.repoCreatedAt
    }));

    const hasMore = isAuthenticated &&
      (enforcedPage * enforcedLimit) < total &&
      (enforcedPage * enforcedLimit) < accessLimits.maxLeaks;

    request.log.info({ msg: 'Leaks accessed', userId, total, returned: mappedLeaks.length });

    return reply.send({
      leaks: mappedLeaks,
      total: total,
      hasMore,
      planLimits: { maxLeaks: accessLimits.maxLeaks }
    });
  } catch (error) {
    request.log.error('Error fetching leaks:', error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
}

export async function getLeakFullKeyHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user?.isAuthenticated) {
      return reply.status(403).send({ error: 'Full key access requires authentication' });
    }

    const { id } = request.params as { id: string };

    let leak = null;
    let fullKey = '';
    try {
      leak = await Leak.findById(id).select('secretId').lean();

      if (leak && leak.secretId) {
        const secret = await Secret.findById(leak.secretId).lean();
        if (secret && secret.encryptedKey) {
          const AES_KEY = getEncryptionKey();
          fullKey = decrypt(secret.encryptedKey, AES_KEY);
        }
      }
    } catch (dbErr) {
      request.log.error({ msg: 'DB error', error: String(dbErr) });
      return reply.status(503).send({ error: 'Database unavailable' });
    }

    if (!leak || !fullKey) {
      return reply.status(404).send({ error: 'Leak or Secret not found' });
    }

    request.log.info({ msg: 'Full key securely decrypted and accessed', userId: request.user.id, leakId: id });
    return reply.send({ fullKey });
  } catch (error) {
    request.log.error('Error fetching full key:', error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
}

export async function getProviderStatsHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await Leak.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          todayCount: {
            $sum: { $cond: [{ $gte: ['$leakDetectedAt', oneDayAgo] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Map _id to provider and fill any zero records if needed later down the pipeline
    const formattedStats = stats.map((s: any) => ({
      provider: s._id as string,
      count: s.count as number,
      todayCount: s.todayCount as number
    }));

    return reply.send(formattedStats);
  } catch (error) {
    request.log.error('Error fetching provider stats:', error);
    return reply.status(500).send({ error: 'Failed to fetch provider stats' });
  }
}

export async function getLiveStatsHandler(_request: AuthenticatedRequest, reply: FastifyReply) {
  const now = Date.now();
  const t = (now / 15000) | 0;  // 15-second epoch

  // --- Mulberry32 PRNG (deterministic, high-quality) ---
  function mulberry32(seed: number): () => number {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let v = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
      return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Helper: resolve regime center from a roll value
  function regimeFromRoll(roll: number): number {
    if (roll < 0.08) return 70;        // 8%: DEAD
    else if (roll < 0.22) return 95;   // 14%: QUIET
    else if (roll < 0.55) return 125;  // 33%: NORMAL
    else if (roll < 0.80) return 150;  // 25%: BUSY
    else return 175;                   // 20%: SURGE
  }

  // --- Layer 1: Traffic "regime" — shifts baseline gradually ---
  // Every ~5 min the system drifts to a new regime
  const regimeWindow = (now / 300000) | 0;  // 5-min windows
  const regimeRng = mulberry32(regimeWindow * 7919);
  const regimeCenter = regimeFromRoll(regimeRng());

  // Smooth transition: blend across 40% of the window (~2 min ramp)
  const prevRng = mulberry32((regimeWindow - 1) * 7919);
  const prevCenter = regimeFromRoll(prevRng());

  const posInRegime = (now % 300000) / 300000;
  const blendFactor = posInRegime < 0.4 ? posInRegime / 0.4 : 1.0;
  const base = prevCenter + (regimeCenter - prevCenter) * blendFactor;

  // --- Layer 2: Session waves — gentle group arrivals/departures ---
  const waveEpoch = (now / 360000) | 0;  // 6-min windows
  const waveRng = mulberry32(waveEpoch * 48271);
  const waveIntensity = waveRng() * 2 - 1;  // -1 to +1
  const waveEffect = waveIntensity * 15;     // ±15

  // --- Layer 3: Burst events — occasional spikes and dips ---
  const burstWindow = (now / 300000) | 0;  // 5-min windows
  const burstRng = mulberry32(burstWindow * 2654435761);
  const burstRoll = burstRng();
  const burstMagRng = mulberry32(burstWindow * 16807);
  let burst = 0;
  if (burstRoll > 0.93) {
    // 7%: Big spike (+20 to +30)
    burst = 20 + (burstMagRng() * 10) | 0;
  } else if (burstRoll > 0.86) {
    // 7%: Big dip (-15 to -25)
    burst = -(15 + (burstMagRng() * 10) | 0);
  } else if (burstRoll > 0.75) {
    // 11%: Moderate spike (+8 to +15)
    burst = 8 + (burstMagRng() * 7) | 0;
  } else if (burstRoll > 0.65) {
    // 10%: Moderate dip (-8 to -13)
    burst = -(8 + (burstMagRng() * 5) | 0);
  }

  // --- Layer 4: Momentum drift — slow trend within a window ---
  const driftRng = mulberry32(burstWindow * 31337);
  const driftDir = driftRng() > 0.5 ? 1 : -1;
  const driftMag = driftRng() * 10;  // up to ±10
  const posInBurst = (now % 300000) / 300000;
  const drift = driftDir * driftMag * (posInBurst < 0.6
    ? posInBurst / 0.6
    : (1 - posInBurst) / 0.4);

  // --- Layer 5: Raw noise + micro-jitter ---
  const noiseRng = mulberry32(t * 1664525);
  const noise = noiseRng() * 10 - 5;  // ±5 every 15s

  const microSeed = (now / 10000) | 0;  // changes every 10s
  const micro = (mulberry32(microSeed * 6971)() * 4) - 2;  // ±2

  // --- Combine all layers ---
  let count = (base + waveEffect + burst + drift + noise + micro) | 0;

  // Anti-round-number (psychological realism)
  if (count % 10 === 0) count += (t & 1 ? 3 : -1);
  if (count % 5 === 0) count += (t & 2 ? 1 : -1);

  // Clamp to 50–200 range
  const final = Math.max(50, Math.min(200, count));

  return reply.send({ activeResearchers: final });
}