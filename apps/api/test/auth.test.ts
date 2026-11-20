import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@young-owl/database';
import { login, makeApp, SEED } from './helpers.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await makeApp({ LOGIN_RATE_LIMIT_MAX: '50' });
});
afterAll(async () => {
  await app.close();
});

describe('auth', () => {
  it('rejects wrong password with a generic message and audits it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: SEED.admin.email, password: 'nope' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
    const log = await prisma.auditLog.findFirst({
      where: { action: 'auth.login.failed' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
  });

  it('rejects unknown email with the same error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ghost@youngowl.lab', password: 'x' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in, sets httpOnly session cookie, and stores only a hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: SEED.admin,
    });
    expect(res.statusCode).toBe(200);
    const session = res.cookies.find((c) => c.name === 'yo_session')!;
    expect(session.httpOnly).toBe(true);
    expect(session.sameSite).toBe('Strict');
    const raw = await prisma.session.findUnique({ where: { id: session.value } });
    expect(raw).toBeNull(); // raw token is never the stored id
  });

  it('returns the current user with role permissions', async () => {
    const { cookie } = await login(app, SEED.researcher);
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('RESEARCHER');
    expect(res.json().user.permissions).toContain('job:create');
  });

  it('requires auth for /auth/me', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('blocks state-changing requests without a CSRF token', async () => {
    const { cookie } = await login(app, SEED.student);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CSRF_FAILED');
  });

  it('logs out with a valid CSRF token and kills the session', async () => {
    const { cookie, csrf } = await login(app, SEED.student);
    const out = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie, 'x-csrf-token': csrf },
    });
    expect(out.statusCode).toBe(204);
    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });
});

describe('login rate limit', () => {
  it('returns 429 after too many attempts', async () => {
    const limited = await makeApp({ LOGIN_RATE_LIMIT_MAX: '3' });
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await limited.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: SEED.admin.email, password: 'bad' },
      });
      codes.push(r.statusCode);
    }
    expect(codes.slice(0, 3)).toEqual([401, 401, 401]);
    expect(codes[3]).toBe(429);
    await limited.close();
  });
});
