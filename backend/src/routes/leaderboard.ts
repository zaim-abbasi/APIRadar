import { FastifyInstance } from 'fastify';
import { 
  getLeaderboardDataHandler
} from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/leaderboard-data', getLeaderboardDataHandler);
} 