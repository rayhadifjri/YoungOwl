import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

export const SEED = {
  admin: {
    email: 'admin@youngowl.lab',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Owl-Admin-2026!',
  },
  researcher: {
    email: 'researcher@youngowl.lab',
    password: process.env.SEED_RESEARCHER_PASSWORD ?? 'Owl-Research-2026!',
  },
  student: {
    email: 'student@youngowl.lab',
    password: process.env.SEED_STUDENT_PASSWORD ?? 'Owl-Student-2026!',
  },
};

export async function makeApp(overrides: Record<string, string> = {}) {
  return buildApp(loadConfig({ ...process.env, ...overrides }));
}

/** Logs in and returns a cookie header + CSRF token for follow-up requests. */
export async function login(app: FastifyInstance, who: { email: string; password: string }) {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: who });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  const cookies = Object.fromEntries(res.cookies.map((c) => [c.name, c.value]));
  return {
    cookie: `yo_session=${cookies.yo_session}; yo_csrf=${cookies.yo_csrf}`,
    csrf: cookies.yo_csrf as string,
  };
}
