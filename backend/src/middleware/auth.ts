import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/environment';

const BEARER_PREFIX = 'Bearer ';

const jwtPayloadSchema = z.object({
  id: z.string().optional(),
  sub: z.string().optional(),
  email: z.string()
}).transform(data => ({
  id: data.id || data.sub || '',
  email: data.email
})).refine(data => data.id.length > 0, { message: 'Missing id or sub claim' });

const ANONYMOUS_USER = { id: 'anonymous', email: 'anonymous@example.com', isAuthenticated: false } as const;

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    isAuthenticated: boolean;
  };
}

export const ACCESS_LIMITS = {
  unauthenticated: { maxLeaks: 6 },
  authenticated: { maxLeaks: Infinity }
} as const;

export async function authenticateUser(request: AuthenticatedRequest, reply: FastifyReply) {
  request.user = { ...ANONYMOUS_USER };

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith(BEARER_PREFIX)) return;

  try {
    const decoded = jwt.verify(authHeader.slice(BEARER_PREFIX.length), config.NEXTAUTH_SECRET);
    const payload = jwtPayloadSchema.parse(decoded);
    request.user = { id: payload.id, email: payload.email, isAuthenticated: true };
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export function getAccessLimits(isAuthenticated: boolean) {
  return isAuthenticated ? ACCESS_LIMITS.authenticated : ACCESS_LIMITS.unauthenticated;
}