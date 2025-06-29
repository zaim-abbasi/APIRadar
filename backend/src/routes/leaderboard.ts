import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/total-repos-scanned', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const totalReposScanned = await ScanAttempt.countDocuments();
      return reply.send({ totalReposScanned });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch total repos scanned' });
    }
  });

  server.get('/api/total-leaks-found', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const totalLeaksFound = await Leak.countDocuments();
      return reply.send({ totalLeaksFound });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch total leaks found' });
    }
  });
} 