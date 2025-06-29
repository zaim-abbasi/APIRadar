import { FastifyInstance } from 'fastify';
import { leaksRoutes } from './leaks';
import { leaderboardRoutes } from './leaderboard';
import { configurationRoutes } from './configuration';

export async function registerRoutes(server: FastifyInstance) {
  await leaksRoutes(server);
  await leaderboardRoutes(server);
  await configurationRoutes(server);
} 