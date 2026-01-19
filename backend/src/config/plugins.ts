import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { config } from './environment';
import { logger } from '../utils/logger';

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  await server.register(helmet, { contentSecurityPolicy: false });
  await server.register(cors, { origin: true, credentials: true });
  await server.register(compress);
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (_req, ctx) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.round(ctx.ttl / 1000)}s`,
    }),
  });

  server.setErrorHandler(async (error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Invalid request data' });
    }
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) logger.error(`[${statusCode}] ${error.message}`);
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Server Error' : 'Bad Request',
      message: statusCode >= 500 ? 'Internal Server Error' : error.message,
    });
  });

  server.setNotFoundHandler(async (request, reply) => {
    if (request.url === '/favicon.ico') return reply.status(204).send();
    logger.warn(`[404] ${request.method} ${request.url}`);
    return reply.status(404).send({ error: 'Not Found', message: 'Route not found' });
  });
}