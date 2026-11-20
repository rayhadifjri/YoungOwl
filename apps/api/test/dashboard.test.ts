import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { login, makeApp, SEED } from './helpers.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await makeApp({ LOGIN_RATE_LIMIT_MAX: '50' });
});
afterAll(async () => {
  await app.close();
});

describe('dashboard summary', () => {
  it('requires login', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary' });
    expect(res.statusCode).toBe(401);
  });

  it('admin sees platform-wide seeded data', async () => {
    const { cookie } = await login(app, SEED.admin);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/summary',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.laboratories).toBe(3);
    expect(body.totals.targets).toBeGreaterThanOrEqual(4); // other test files add targets
    expect(body.totals.assessments).toBeGreaterThanOrEqual(6);
    expect(body.totals.openVulnerabilities).toBeGreaterThan(0);
    expect(body.assessmentsByMonth).toHaveLength(6);
    expect(body.securityScore).toBeGreaterThanOrEqual(0);
    expect(body.securityScore).toBeLessThanOrEqual(100);
    expect(body.systemHealth.database).toBe('ok');
  });

  it('student only sees their own assessments', async () => {
    const { cookie } = await login(app, SEED.student);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/summary',
      headers: { cookie },
    });
    const body = res.json();
    expect(body.totals.assessments).toBe(1);
    expect(body.totals.openVulnerabilities).toBe(0);
    expect(body.learning.completedLessons).toBe(4);
  });
});

describe('system', () => {
  it('health is public', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/system/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});
