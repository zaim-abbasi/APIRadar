import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { z } from 'zod';
import { AuthenticatedRequest, getPlanLimits, validatePlanAccess } from '../middleware/auth';

const querySchema = z.object({
  provider: z.string().optional(),
  timeRange: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export async function getLeaksHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Ensure authentication middleware has run
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const user = request.user;
    const isAuthenticated = user.isAuthenticated;
    const plan = user.plan;

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors });
    }

    const { provider, timeRange, sortBy, limit, page } = parsed.data;
    const planLimits = getPlanLimits(plan);

    // Security: Enforce plan-based limits
    let enforcedLimit = Math.min(limit, planLimits.maxLeaks);
    let enforcedPage = planLimits.canInfiniteScroll ? page : 1;
    
    // For unauthorized users, limit to 4 leaks maximum
    if (!isAuthenticated) {
      enforcedLimit = Math.min(enforcedLimit, 4);
      enforcedPage = 1; // No pagination for unauthorized users
    }

    // Security: Enforce time range limits
    let enforcedTimeRange = timeRange;
    if (planLimits.maxTimeRange !== 'all') {
      // For free and basic users, allow both '7d' and '15d'
      const allowedTimeRanges = plan === 'pro' ? ['all'] : ['7d', '15d'];
      
      if (timeRange && !allowedTimeRanges.includes(timeRange)) {
        // Log potential security violation
        request.log.warn({
          msg: 'Time range violation attempt',
          userId: user.id,
          userPlan: user.plan,
          requestedTimeRange: timeRange,
          allowedTimeRanges: allowedTimeRanges,
          ip: request.ip
        });
        enforcedTimeRange = '15d'; // Default to 15d for free/basic users
      }
    }

    // Build filter with security constraints
    const filter: any = {};
    if (provider && provider !== 'all') filter.provider = provider;
    
    if (enforcedTimeRange) {
      const now = new Date();
      let days = 0;
      if (enforcedTimeRange === '7d') days = 7;
      else if (enforcedTimeRange === '15d') days = 15;
      else if (enforcedTimeRange === '30d') days = 30;
      if (days > 0) {
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filter.leakIntroducedAt = { $gte: fromDate };
      }
    }

    // Security: For non-pro users, limit to recent leaks only
    if (plan !== 'pro') {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // Last 30 days for non-pro
      filter.leakDetectedAt = { $gte: recentDate };
    }

    let sort: any = { leakIntroducedAt: -1 };
    if (sortBy === 'oldest') sort = { leakIntroducedAt: 1 };
    else if (sortBy === 'provider') sort = { provider: 1, leakIntroducedAt: -1 };

    // Get total count for pagination (for summary)
    const total = await Leak.countDocuments(filter);

    // Security: Enforce maximum results for non-pro users (for cards only)
    let maxResults = total;
    if (plan !== 'pro') {
      maxResults = Math.min(total, planLimits.maxLeaks);
    }
    
    // For unauthorized users, limit to 4 results maximum
    if (!isAuthenticated) {
      maxResults = Math.min(maxResults, 4);
    }

    // Calculate pagination with security limits
    const skip = planLimits.canInfiniteScroll ? (enforcedPage - 1) * enforcedLimit : 0;
    const actualLimit = planLimits.canInfiniteScroll ? enforcedLimit : planLimits.maxLeaks;

    // Fetch leaks with security constraints
    const leaks = await Leak.find(filter)
      .select('redactedKey provider repoUrl filePath leakIntroducedAt leakDetectedAt repoCreatedAt fullKey')
      .sort(sort)
      .skip(skip)
      .limit(actualLimit)
      .lean();

    // Security: Remove sensitive data based on authentication status
    const mappedLeaks = leaks.map((leak: any) => {
      const baseLeak = {
        id: leak.id || leak._id,
        provider: leak.provider,
        leakDetectedAt: leak.leakDetectedAt,
        leakIntroducedAt: leak.leakIntroducedAt,
        isLocked: !isAuthenticated
      };

      if (isAuthenticated) {
        // Authenticated users get full data (except fullKey for non-pro)
        return {
          ...baseLeak,
          redactedKey: leak.redactedKey,
          repoUrl: leak.repoUrl,
          filePath: leak.filePath,
          repoCreatedAt: leak.repoCreatedAt,
          fullKey: plan === 'pro' ? leak.fullKey : undefined
        };
      } else {
        // Unauthorized users get minimal data
        return {
          ...baseLeak,
          redactedKey: leak.redactedKey ? `${leak.redactedKey.slice(0, 8)}****` : 'sk-****',
          repoUrl: null,
          filePath: null,
          repoCreatedAt: null,
          fullKey: null
        };
      }
    });

    // Calculate hasMore based on plan limits
    let hasMore = false;
    if (planLimits.canInfiniteScroll && isAuthenticated) {
      hasMore = (enforcedPage * enforcedLimit) < total; // use true total for hasMore
    }

    // Log access for security monitoring
    request.log.info({
      msg: 'Leaks accessed',
      userId: user.id,
      userPlan: plan,
      isAuthenticated: isAuthenticated,
      requestedLimit: limit,
      enforcedLimit: actualLimit,
      requestedPage: page,
      enforcedPage: enforcedPage,
      totalResults: total,
      returnedResults: mappedLeaks.length,
      hasMore,
      ip: request.ip
    });

    return reply.send({ 
      leaks: mappedLeaks, 
      total, // always return the true total for summary
      hasMore,
      planLimits: {
        maxLeaks: planLimits.maxLeaks,
        canInfiniteScroll: planLimits.canInfiniteScroll,
        maxTimeRange: planLimits.maxTimeRange
      }
    });

  } catch (error) {
    request.log.error('Error fetching leaks:', error);
    return reply.status(500).send({ error: 'Failed to fetch leaks' });
  }
}

export async function getLeakFullKeyHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Ensure authentication middleware has run
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const user = request.user;
    const planLimits = getPlanLimits(user.plan);

    // Security: Only pro users can access full keys
    if (!planLimits.canAccessFullKey) {
      request.log.warn({
        msg: 'Unauthorized full key access attempt',
        userId: user.id,
        userPlan: user.plan,
        leakId: id,
        ip: request.ip
      });
      return reply.status(403).send({ 
        error: 'Full key access requires Pro plan',
        upgradeRequired: true
      });
    }

    const leak = await Leak.findById(id).select('+fullKey');
    if (!leak) {
      return reply.status(404).send({ error: 'Leak not found' });
    }

    // Log full key access for security monitoring
    request.log.info({
      msg: 'Full key accessed',
      userId: user.id,
      userPlan: user.plan,
      leakId: id,
      ip: request.ip
    });

    return reply.send({ fullKey: leak.fullKey });

  } catch (error) {
    request.log.error('Error fetching full key:', error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
} 