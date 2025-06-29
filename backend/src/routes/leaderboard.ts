import { FastifyInstance } from 'fastify';
import { 
  getLeaderboardDataHandler
} from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  // Comprehensive leaderboard data endpoint (includes all stats + repository cutoff)
  server.get('/api/leaderboard-data', getLeaderboardDataHandler);
} 