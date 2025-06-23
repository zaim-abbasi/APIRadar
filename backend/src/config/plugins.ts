import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { config } from './environment';

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });

  // CORS
  await server.register(cors, {
    origin: config.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.com'] 
      : true,
    credentials: true,
  });

  // Compression
  await server.register(compress, {
    global: true,
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (request, context) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        expiresIn: Math.round(context.ttl / 1000),
      };
    },
  });

  // Global error handler
  server.setErrorHandler(async (error, request, reply) => {
    server.log.error(error);

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.validation,
      });
    }

    // MongoDB errors
    if (error.name === 'MongoError' || error.name === 'ValidationError') {
      return reply.status(400).send({
        error: 'Database Error',
        message: 'Invalid data provided',
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    return reply.status(statusCode).send({
      error: 'Server Error',
      message,
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // Not found handler
  server.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}