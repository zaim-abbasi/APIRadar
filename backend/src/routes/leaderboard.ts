import { FastifyInstance } from 'fastify';
import {
  getLeaderboardActivityHandler,
  getLeaderboardDataHandler,
  getTopLeakersHandler,
  leaderboardDataSchema,
  activitySchema,
  topLeakersSchema
} from '../controllers/leaderboardController';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/leaderboard', { schema: leaderboardDataSchema }, getLeaderboardDataHandler);
  server.get('/leaderboard/activity', { schema: activitySchema }, getLeaderboardActivityHandler);
  server.get('/leaderboard/top-leakers', { schema: topLeakersSchema }, getTopLeakersHandler);
}