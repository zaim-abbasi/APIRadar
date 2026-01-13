import { FastifyInstance } from 'fastify';
import { 
  getLeaderboardActivityHandler,
  getLeaderboardDataHandler
} from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/leaderboard-data', getLeaderboardDataHandler);
  server.get('/api/leaderboard/activity', getLeaderboardActivityHandler);
} 