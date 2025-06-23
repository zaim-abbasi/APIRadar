import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';

export async function getProvidersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const providers = await Leak.distinct('provider');
    return reply.send({ providers });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch providers' });
  }
} 