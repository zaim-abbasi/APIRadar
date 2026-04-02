import { FastifyRequest, FastifyReply } from 'fastify';
import { FeatureRequest } from '../models/FeatureRequest';

export const createFeatureRequestSchema = {
  body: {
    type: 'object',
    required: ['email', 'text'],
    properties: {
      email: { type: 'string', format: 'email' },
      text: { type: 'string', minLength: 1, maxLength: 150 }
    }
  }
};

export const createFeatureRequestHandler = async (
  request: FastifyRequest<{ Body: { email: string; text: string } }>,
  reply: FastifyReply
) => {
  try {
    const { email, text } = request.body;

    const recentRequestsCount = await FeatureRequest.countDocuments({
      email,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    if (recentRequestsCount >= 3) {
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }

    const newRequest = new FeatureRequest({
      email,
      text
    });

    await newRequest.save();

    return reply.status(201).send({ success: true });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};
