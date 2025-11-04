import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Types for authentication
export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    isAuthenticated: boolean;
  };
}

// Access limits - simple two-tier system
export const ACCESS_LIMITS = {
  // Unauthenticated users (Free)
  unauthenticated: {
    maxLeaks: 6,
    maxTimeRange: '15d',
    canAccessFullKey: false,
    canInfiniteScroll: false
  },
  // Authenticated users (Pro)
  authenticated: {
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
  'x-user-authenticated': z.string().optional(),
});

// Rate limiting configuration
const RATE_LIMITS = {
  authenticated: { requests: 200, window: 60000 }, // 200 requests per minute for logged-in users
  unauthenticated: { requests: 10, window: 60000 } // 10 requests per minute for anonymous users
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function authenticateUser(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Parse authentication headers
    const authData = authSchema.safeParse({
      'x-user-id': request.headers['x-user-id'],
      'x-user-email': request.headers['x-user-email'],
      'x-user-authenticated': request.headers['x-user-authenticated'],
    });

    if (!authData.success) {
      return reply.status(401).send({ 
        error: 'Invalid authentication headers',
        details: authData.error.errors 
      });
    }

    const { 'x-user-id': userId, 'x-user-email': userEmail, 'x-user-authenticated': isAuthenticated } = authData.data;

    // Determine authentication status - simple: logged in or not
    const isUserAuthenticated: boolean = isAuthenticated === 'true' && !!userId && !!userEmail;

    // Rate limiting check
    const clientId = userId || request.ip || 'anonymous';
    const rateLimit = isUserAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.unauthenticated;
    
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
    const user = {
      id: userId || 'anonymous',
      email: userEmail || 'anonymous@example.com',
      isAuthenticated: isUserAuthenticated
    };
    request.user = user;

    // Log authentication for security monitoring
    request.log.info({
      msg: 'User authenticated',
      userId: user.id,
      userEmail: user.email,
      isAuthenticated: user.isAuthenticated,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

  } catch (error) {
    request.log.error('Authentication error:', error);
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}

export function getAccessLimits(isAuthenticated: boolean) {
  return isAuthenticated ? ACCESS_LIMITS.authenticated : ACCESS_LIMITS.unauthenticated;
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