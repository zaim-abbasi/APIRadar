import { FastifyInstance } from 'fastify';
import { 
  getLeaderboardActivityHandler,
  getLeaderboardDataHandler,
  getTopLeakersHandler
} from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/api/leaderboard-data', getLeaderboardDataHandler);
  server.get('/api/leaderboard/activity', getLeaderboardActivityHandler);
  server.get('/api/leaderboard/top-leakers', getTopLeakersHandler);
} 