import { FastifyInstance } from 'fastify';
import { getLeaderboardHandler, getProvidersHandler } from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/leaderboard', {
    handler: getLeaderboardHandler,
  });
  
  server.get('/api/providers', {
    handler: getProvidersHandler,
  });
} 