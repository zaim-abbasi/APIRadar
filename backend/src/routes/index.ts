import { FastifyInstance } from 'fastify';
import { leaksRoutes } from './leaks';
import { providersRoutes } from './providers';
import { leaderboardRoutes } from './leaderboard';
import { learnRoutes } from './learn';

export async function registerRoutes(server: FastifyInstance) {
  await leaksRoutes(server);
  await providersRoutes(server);
  await leaderboardRoutes(server);
  await learnRoutes(server);
} 