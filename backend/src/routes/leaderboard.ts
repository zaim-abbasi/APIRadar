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

  server.get('/api/top-providers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const topProviders = await Leak.aggregate([
        {
          $match: {
            provider: { $in: ['openai', 'google_gemini', 'anthropic'] }
          }
        },
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Calculate total count for percentage calculation
      const totalCount = topProviders.reduce((sum, item) => sum + item.count, 0);

      // Transform the data to match frontend expectations with percentages
      const transformedData = topProviders.map(item => ({
        provider: item._id,
        count: item.count,
        percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0
      }));

      return reply.send({ topProviders: transformedData });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch top providers' });
    }
  });
} 