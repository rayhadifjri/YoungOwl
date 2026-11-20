import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@young-owl/database';
import type { Permission, SessionUser } from '@young-owl/shared';
import { sha256, safeEqual } from '../lib/crypto.js';
import { Forbidden, Unauthenticated, AppError } from '../lib/errors.js';

export const SESSION_COOKIE = 'yo_session';
export const CSRF_COOKIE = 'yo_csrf';
export const CSRF_HEADER = 'x-csrf-token';

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
    sessionId: string | null;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      ...perms: Permission[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Resolves the session cookie to a user on every request, enforces CSRF
 * (double-submit cookie) on state-changing requests, and exposes RBAC guards.
 */
export default fp(async (app) => {
  app.decorateRequest('user', null);
  app.decorateRequest('sessionId', null);

  app.addHook('onRequest', async (req) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (!raw) return;
    const session = await prisma.session.findUnique({
      where: { id: sha256(raw) },
      include: {
        user: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) return;
    const u = session.user;
    req.sessionId = session.id;
    req.user = {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      role: u.role.name,
      permissions: u.role.permissions.map((rp) => rp.permission.key),
    };
  });

  // CSRF: authenticated, state-changing requests must echo the CSRF cookie in a header.
  app.addHook('preHandler', async (req) => {
    if (SAFE_METHODS.has(req.method) || !req.user) return;
    // Login is protected by SameSite=Strict and issues a fresh CSRF token itself.
    if (req.routeOptions.url === '/api/v1/auth/login') return;
    const cookie = req.cookies[CSRF_COOKIE];
    const header = req.headers[CSRF_HEADER];
    if (!cookie || typeof header !== 'string' || !safeEqual(cookie, header)) {
      throw new AppError(403, 'CSRF_FAILED', 'Missing or invalid CSRF token.');
    }
  });

  app.decorate('requireAuth', async (req: FastifyRequest) => {
    if (!req.user) throw Unauthenticated();
  });

  app.decorate('requirePermission', (...perms: Permission[]) => async (req: FastifyRequest) => {
    if (!req.user) throw Unauthenticated();
    const missing = perms.filter((p) => !req.user!.permissions.includes(p));
    if (missing.length) throw Forbidden();
  });
});
