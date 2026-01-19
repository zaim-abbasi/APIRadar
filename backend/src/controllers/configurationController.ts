import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigurationService } from '../services/ConfigurationService';

const scanStateProperties = {
  type: 'object',
  properties: {
    currentProviderIndex: { type: 'number' },
    currentQueryIndex: { type: 'number' },
    currentPage: { type: 'number' },
    providerStates: { type: 'object', additionalProperties: true },
    scanStatus: { type: 'string' },
    lastProcessedTime: { type: 'number' }
  },
  additionalProperties: true
};

export const getScanStateSchema = {
  response: {
    200: {
      type: 'object',
      properties: { scanState: scanStateProperties }
    },
    404: {
      type: 'object',
      properties: { error: { type: 'string' } }
    }
  }
};

export const updateScanStateSchema = {
  body: {
    type: 'object',
    required: ['scanState'],
    properties: { scanState: scanStateProperties }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        scanState: scanStateProperties
      }
    },
    500: {
      type: 'object',
      properties: { error: { type: 'string' } }
    }
  }
};

export async function getScanStateHandler(_request: FastifyRequest, reply: FastifyReply) {
  const scanState = await ConfigurationService.getScanState();
  if (scanState) {
    return reply.send({ scanState });
  }
  return reply.status(404).send({ error: 'Scan state not found' });
}

export async function updateScanStateHandler(request: FastifyRequest<{ Body: { scanState: any } }>, reply: FastifyReply) {
  const { scanState } = request.body;
  const success = await ConfigurationService.setScanState(scanState);
  if (success) {
    return reply.send({ message: 'Scan state updated successfully', scanState });
  }
  return reply.status(500).send({ error: 'Failed to update scan state' });
}
