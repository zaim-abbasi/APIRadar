import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    isAuthenticated: boolean;
  };
}

export const ACCESS_LIMITS = {
  unauthenticated: {
    maxLeaks: 6
  },
  authenticated: {
    maxLeaks: Infinity
  }
} as const;

export async function authenticateUser(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const user = {
      id: 'anonymous',
      email: 'anonymous@example.com',
      isAuthenticated: false
    };

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, config.NEXTAUTH_SECRET) as jwt.JwtPayload;
        const decodedId = typeof decoded?.['id'] === 'string' ? decoded['id'] : undefined;
        const decodedEmail = typeof decoded?.['email'] === 'string' ? decoded['email'] : undefined;
        user.id = decodedId || 'authenticated';
        user.email = decodedEmail || 'authenticated@example.com';
        user.isAuthenticated = true;
      } catch (err) {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }
    }

    request.user = user;
  } catch (error) {
    request.log.error('Authentication error:', error);
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}

export function getAccessLimits(isAuthenticated: boolean) {
  return isAuthenticated ? ACCESS_LIMITS.authenticated : ACCESS_LIMITS.unauthenticated;
}