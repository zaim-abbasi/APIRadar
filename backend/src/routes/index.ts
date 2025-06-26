import { FastifyInstance } from 'fastify';
import { leaksRoutes } from './leaks';
import { leaderboardRoutes } from './leaderboard';
import { healthRoutes } from './health';

export async function registerRoutes(server: FastifyInstance) {
  await healthRoutes(server);
  await leaksRoutes(server);
  await leaderboardRoutes(server);
} 