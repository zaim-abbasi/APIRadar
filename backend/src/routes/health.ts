import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getConnectionStatus } from '../config/mongo';
import { clearRateLimit } from '../services/rateLimitManager';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/api/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const startTime = process.uptime();
    const mongoStatus = getConnectionStatus();
    
    const healthData = {
      status: 'ok',
      uptime: Math.floor(startTime),
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus ? 'connected' : 'disconnected'
      }
    };

    // Return 503 if MongoDB is not connected
    if (!mongoStatus) {
      healthData.status = 'degraded';
      return reply.status(503).send(healthData);
    }

    return reply.send(healthData);
  });

  // Debug endpoint to force clear rate limit state
  server.post('/api/debug/clear-rate-limit', async (_request: FastifyRequest, reply: FastifyReply) => {
    clearRateLimit();
    return reply.send({ 
      status: 'Rate limit state cleared', 
      timestamp: new Date().toISOString() 
    });
  });
} 