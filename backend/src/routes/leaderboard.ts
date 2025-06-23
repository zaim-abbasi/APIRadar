import { FastifyInstance } from 'fastify';
import { getLeaderboardHandler } from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/leaderboard', {
    handler: getLeaderboardHandler,
  });
} 