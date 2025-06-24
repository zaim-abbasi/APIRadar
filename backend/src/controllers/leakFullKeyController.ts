import { FastifyRequest, FastifyReply } from 'fastify';
import { Leak } from '../models/Leak';

export async function getLeakFullKeyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  try {
    const leak = await Leak.findById(id).select('+fullKey');
    if (!leak) {
      return reply.status(404).send({ error: 'Leak not found' });
    }
    return reply.send({ fullKey: leak.fullKey });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch full key' });
  }
} 