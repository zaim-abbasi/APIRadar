import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';

export async function getLearnHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const filePath = path.join(__dirname, '../static/learn.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return reply.send(JSON.parse(content));
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to load learn content' });
  }
} 