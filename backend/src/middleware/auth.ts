import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Types for authentication
export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'basic' | 'pro';
    isAuthenticated: boolean;
  };
}

// Plan-based limits
export const PLAN_LIMITS = {
  free: {
    maxLeaks: 4,
    maxTimeRange: '15d', // Backend allows both 7d and 15d via controller logic
    canAccessFullKey: false,
    canInfiniteScroll: false
  },
  basic: {
    maxLeaks: 6,
    maxTimeRange: '15d', // Backend allows both 7d and 15d via controller logic
    canAccessFullKey: true,
    canInfiniteScroll: false
  },
  pro: {
    maxLeaks: Infinity,
    maxTimeRange: 'all',
    canAccessFullKey: true,
    canInfiniteScroll: true
  }
} as const;

// Authentication schema
const authSchema = z.object({
  'x-user-id': z.string().optional(),
  'x-user-email': z.string().email().optional(),
  'x-user-plan': z.enum(['free', 'basic', 'pro']).optional(),
  'x-user-authenticated': z.string().optional(),
});

// Rate limiting configuration
const RATE_LIMITS = {
  free: { requests: 10, window: 60000 }, // 10 requests per minute
  basic: { requests: 50, window: 60000 }, // 50 requests per minute
  pro: { requests: 200, window: 60000 }, // 200 requests per minute
  unauthenticated: { requests: 5, window: 60000 } // 5 requests per minute
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function authenticateUser(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Parse authentication headers
    const authData = authSchema.safeParse({
      'x-user-id': request.headers['x-user-id'],
      'x-user-email': request.headers['x-user-email'],
      'x-user-plan': request.headers['x-user-plan'],
      'x-user-authenticated': request.headers['x-user-authenticated'],
    });

    if (!authData.success) {
      return reply.status(401).send({ 
        error: 'Invalid authentication headers',
        details: authData.error.errors 
      });
    }

    const { 'x-user-id': userId, 'x-user-email': userEmail, 'x-user-plan': userPlan, 'x-user-authenticated': isAuthenticated } = authData.data;

    // Determine user plan and authentication status
    let plan: 'free' | 'basic' | 'pro' = 'free';
    let isUserAuthenticated = false;

    if (isAuthenticated === 'true' && userId && userEmail) {
      isUserAuthenticated = true;
      plan = userPlan || 'basic';
    }

    // Rate limiting check
    const clientId = userId || request.ip || 'anonymous';
    const rateLimit = RATE_LIMITS[plan] || RATE_LIMITS.unauthenticated;
    
    const now = Date.now();
    const clientData = rateLimitStore.get(clientId);
    
    if (clientData && now < clientData.resetTime) {
      if (clientData.count >= rateLimit.requests) {
        return reply.status(429).send({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }
      clientData.count++;
    } else {
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + rateLimit.window
      });
    }

    // Set user context
    request.user = {
      id: userId || 'anonymous',
      email: userEmail || 'anonymous@example.com',
      plan,
      isAuthenticated: isUserAuthenticated
    };

    // Log authentication for security monitoring
    request.log.info({
      msg: 'User authenticated',
      userId: request.user.id,
      userEmail: request.user.email,
      plan: request.user.plan,
      isAuthenticated: request.user.isAuthenticated,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

  } catch (error) {
    request.log.error('Authentication error:', error);
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}

export function getPlanLimits(plan: 'free' | 'basic' | 'pro') {
  return PLAN_LIMITS[plan];
}

export function validatePlanAccess(request: AuthenticatedRequest, requiredPlan: 'free' | 'basic' | 'pro'): boolean {
  const user = request.user;
  if (!user) return false;

  const planHierarchy = { free: 0, basic: 1, pro: 2 };
  return planHierarchy[user.plan] >= planHierarchy[requiredPlan];
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute 