import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@young-owl/database';
import { login, makeApp, SEED } from './helpers.js';

let app: FastifyInstance;
type Session = Awaited<ReturnType<typeof login>>;
let admin: Session, researcher: Session, student: Session;
const run = Date.now().toString(36);
let webLabId: string;
let juiceId: string;

const call = (
  s: Session,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: unknown,
) =>
  app.inject({
    method,
    url: `/api/v1${url}`,
    payload: payload as object,
    headers: { cookie: s.cookie, 'x-csrf-token': s.csrf },
  });

beforeAll(async () => {
  app = await makeApp({ LOGIN_RATE_LIMIT_MAX: '50', RATE_LIMIT_MAX: '1000' });
  [admin, researcher, student] = await Promise.all([
    login(app, SEED.admin),
    login(app, SEED.researcher),
    login(app, SEED.student),
  ]);
  webLabId = (await prisma.laboratory.findUniqueOrThrow({ where: { slug: 'web-basics' } })).id;
  juiceId = (await prisma.target.findFirstOrThrow({ where: { hostname: 'juice-shop' } })).id;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `.${run}@youngowl.lab` } } });
  await app.close();
});

describe('labs & targets', () => {
  it('lists labs and targets for any role', async () => {
    expect((await call(student, 'GET', '/labs')).json().data.length).toBe(3);
    const t = (await call(student, 'GET', `/targets?labId=${webLabId}`)).json();
    expect(t.meta.total).toBe(2);
    expect(t.data[0].laboratory.name).toBe('Web Application Basics');
  });

  it('searches targets', async () => {
    expect((await call(student, 'GET', '/targets?q=juice')).json().meta.total).toBe(1);
  });

  it('blocks students from creating targets', async () => {
    const r = await call(student, 'POST', '/targets', {});
    expect(r.statusCode).toBe(403);
  });

  const base = () => ({
    laboratoryId: webLabId,
    name: `Test ${run}`,
    hostname: `t-${run}`,
    appType: 'web',
    difficulty: 'BEGINNER',
    dockerImage: 'nginx:alpine',
  });

  it('rejects an IP outside the lab network', async () => {
    const r = await call(admin, 'POST', '/targets', { ...base(), ipAddress: '8.8.8.8' });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('OUT_OF_SCOPE');
  });

  it('rejects a base URL that points somewhere else', async () => {
    const r = await call(admin, 'POST', '/targets', { ...base(), baseUrl: 'https://example.com' });
    expect(r.json().error.code).toBe('OUT_OF_SCOPE');
  });

  it('creates, updates and deletes an in-scope target', async () => {
    const r = await call(admin, 'POST', '/targets', {
      ...base(),
      ipAddress: '172.30.10.99',
      baseUrl: `http://t-${run}:8080`,
    });
    expect(r.statusCode).toBe(201);
    const id = r.json().id;
    const u = await call(admin, 'PATCH', `/targets/${id}`, { status: 'ONLINE' });
    expect(u.json().status).toBe('ONLINE');
    const dup = await call(admin, 'POST', '/targets', { ...base() });
    expect(dup.statusCode).toBe(409);
    expect((await call(admin, 'DELETE', `/targets/${id}`)).statusCode).toBe(204);
  });

  it('refuses to delete a target that has assessments', async () => {
    const r = await call(admin, 'DELETE', `/targets/${juiceId}`);
    expect(r.statusCode).toBe(409);
  });

  it('validates input', async () => {
    const r = await call(admin, 'POST', '/targets', { ...base(), hostname: 'Bad Host!' });
    expect(r.statusCode).toBe(400);
  });
});

describe('assessments, findings and reports', () => {
  let assessmentId: string;

  it('researcher starts an assessment', async () => {
    const r = await call(researcher, 'POST', '/assessments', {
      title: `Run ${run}`,
      targetId: juiceId,
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().status).toBe('IN_PROGRESS');
    assessmentId = r.json().id;
  });

  it('student cannot see it (404, not 403)', async () => {
    expect((await call(student, 'GET', `/assessments/${assessmentId}`)).statusCode).toBe(404);
    const list = (await call(student, 'GET', '/assessments')).json();
    expect(
      list.data.every(
        (a: { owner: { displayName: string } }) => a.owner.displayName === 'Owlet Student',
      ),
    ).toBe(true);
  });

  it('admin sees it and every assessment', async () => {
    expect((await call(admin, 'GET', `/assessments/${assessmentId}`)).statusCode).toBe(200);
    expect(
      (await call(admin, 'GET', '/assessments?pageSize=100')).json().meta.total,
    ).toBeGreaterThanOrEqual(7);
  });

  it('computes CVSS score and severity from the vector', async () => {
    const r = await call(researcher, 'POST', `/assessments/${assessmentId}/vulnerabilities`, {
      title: 'SQLi',
      category: 'A03:2021 Injection',
      cwe: 'CWE-89',
      description: 'x',
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      severity: 'LOW',
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().cvssScore).toBe(9.8);
    expect(r.json().severity).toBe('CRITICAL');
  });

  it('needs a vector or a severity', async () => {
    const r = await call(researcher, 'POST', `/assessments/${assessmentId}/vulnerabilities`, {
      title: 'x',
      category: 'y',
      description: 'z',
    });
    expect(r.statusCode).toBe(400);
  });

  it('rejects an invalid vector', async () => {
    const r = await call(researcher, 'POST', `/assessments/${assessmentId}/vulnerabilities`, {
      title: 'x',
      category: 'y',
      description: 'z',
      cvssVector: 'CVSS:3.1/AV:Q',
    });
    expect(r.statusCode).toBe(400);
  });

  it('students cannot write findings', async () => {
    const r = await call(student, 'POST', `/assessments/${assessmentId}/vulnerabilities`, {});
    expect(r.statusCode).toBe(403);
  });

  it('updates a finding and completes the assessment', async () => {
    const f = (await call(researcher, 'GET', `/assessments/${assessmentId}/vulnerabilities`)).json()
      .data[0];
    const u = await call(researcher, 'PATCH', `/vulnerabilities/${f.id}`, { status: 'CONFIRMED' });
    expect(u.json().status).toBe('CONFIRMED');
    const c = await call(researcher, 'PATCH', `/assessments/${assessmentId}`, {
      status: 'COMPLETED',
    });
    expect(c.json().completedAt).toBeTruthy();
  });

  it('generates Markdown and JSON reports and protects downloads', async () => {
    const md = await call(researcher, 'POST', `/assessments/${assessmentId}/reports`, {
      format: 'MARKDOWN',
    });
    expect(md.statusCode).toBe(201);
    const dl = await call(researcher, 'GET', `/reports/${md.json().id}/download`);
    expect(dl.headers['content-type']).toContain('text/markdown');
    expect(dl.headers['content-disposition']).toContain('.md');
    expect(dl.body).toContain('CVSS 9.8');

    const js = await call(researcher, 'POST', `/assessments/${assessmentId}/reports`, {
      format: 'JSON',
    });
    const body = JSON.parse(
      (await call(researcher, 'GET', `/reports/${js.json().id}/download`)).body,
    );
    expect(body.findings[0].severity).toBe('CRITICAL');

    // Students lack report:read entirely.
    expect((await call(student, 'GET', `/reports/${md.json().id}/download`)).statusCode).toBe(403);
  });

  it('seeded reports are downloadable', async () => {
    const list = (await call(admin, 'GET', '/reports')).json();
    expect(list.meta.total).toBeGreaterThanOrEqual(4);
    const seeded = list.data.find((r: { title: string }) => r.title.includes('baseline recon'));
    const dl = await call(admin, 'GET', `/reports/${seeded.id}/download`);
    expect(dl.statusCode).toBe(200);
    expect(dl.body).toContain('# Juice Shop baseline recon');
  });
});

describe('users, audit, docs', () => {
  it('admin creates users; duplicates conflict', async () => {
    const payload = {
      email: `new.${run}@youngowl.lab`,
      username: `new-${run}`,
      displayName: 'New Owl',
      role: 'STUDENT',
      password: 'A-long-password-123',
    };
    expect((await call(admin, 'POST', '/users', payload)).statusCode).toBe(201);
    expect((await call(admin, 'POST', '/users', payload)).statusCode).toBe(409);
  });

  it('admin cannot deactivate themselves', async () => {
    const me = (await call(admin, 'GET', '/auth/me')).json().user;
    expect((await call(admin, 'PATCH', `/users/${me.id}`, { isActive: false })).statusCode).toBe(
      409,
    );
  });

  it('only admins read users and audit logs', async () => {
    expect((await call(researcher, 'GET', '/users')).statusCode).toBe(403);
    expect((await call(researcher, 'GET', '/audit-logs')).statusCode).toBe(403);
    const logs = (await call(admin, 'GET', '/audit-logs?action=assessment.')).json();
    expect(logs.data.length).toBeGreaterThan(0);
    expect(logs.data.every((l: { action: string }) => l.action.startsWith('assessment.'))).toBe(
      true,
    );
  });

  it('serves an OpenAPI document', async () => {
    const doc = (await call(student, 'GET', '/openapi.json')).json();
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.paths['/api/v1/targets'].post.requestBody).toBeTruthy();
    expect(doc.paths['/api/v1/assessments/{id}'].get.parameters[0].in).toBe('path');
  });

  it('new routes enforce CSRF', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/assessments',
      headers: { cookie: researcher.cookie },
      payload: { title: 'x', targetId: juiceId },
    });
    expect(r.statusCode).toBe(403);
  });
});
