import request from 'supertest';
import { server } from '../src/server';
import { Leak } from '../src/models/Leak';

describe('GET /api/leaks', () => {
  beforeAll(async () => {
    await Leak.create({
      redactedKey: 'sk-xxxx',
      provider: 'openai',
      repoName: 'test/repo',
      repoUrl: 'https://github.com/test/repo',
      authorName: 'testuser',
      authorUrl: 'https://github.com/testuser',
      timestamp: new Date(),
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return leaks', async () => {
    const res = await request(server.server).get('/api/leaks');
    expect(res.status).toBe(200);
    expect(res.body.leaks.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });
}); 