import type { FastifyPluginAsync } from 'fastify';
import { changePasswordSchema, loginRequestSchema } from '@young-owl/shared';
import type { Config } from '../../config.js';
import { audit } from '../../lib/audit.js';
import { randomToken } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../plugins/auth.js';
import { changePassword, createSession, destroySession, verifyCredentials } from './service.js';

export const authRoutes: FastifyPluginAsync<{ config: Config }> = async (app, { config }) => {
  const cookieBase = { path: '/', sameSite: 'strict' as const, secure: config.COOKIE_SECURE };

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: config.LOGIN_RATE_LIMIT_MAX, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = loginRequestSchema.parse(req.body);
      const user = await verifyCredentials(body.email, body.password);
      if (!user) {
        await audit(
          { action: 'auth.login.failed', ip: req.ip, metadata: { email: body.email } },
          req.log,
        );
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      }
      // Rotate: drop any session this browser already had.
      if (req.sessionId) await destroySession(req.sessionId);
      const { token, expiresAt } = await createSession(user.id, config.SESSION_TTL_HOURS, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      reply
        .setCookie(SESSION_COOKIE, token, { ...cookieBase, httpOnly: true, expires: expiresAt })
        .setCookie(CSRF_COOKIE, randomToken(), {
          ...cookieBase,
          httpOnly: false,
          expires: expiresAt,
        });
      await audit({ actorId: user.id, action: 'auth.login', ip: req.ip }, req.log);
      return { user: { id: user.id, email: user.email, displayName: user.displayName } };
    },
  );

  app.post('/auth/logout', { preHandler: app.requireAuth }, async (req, reply) => {
    await destroySession(req.sessionId!);
    await audit({ actorId: req.user!.id, action: 'auth.logout', ip: req.ip }, req.log);
    reply.clearCookie(SESSION_COOKIE, cookieBase).clearCookie(CSRF_COOKIE, cookieBase);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: app.requireAuth }, async (req) => ({ user: req.user }));

  app.post('/auth/change-password', { preHandler: app.requireAuth }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body);
    const ok = await changePassword(
      req.user!.id,
      body.currentPassword,
      body.newPassword,
      req.sessionId!,
    );
    if (!ok) throw new AppError(400, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
    await audit({ actorId: req.user!.id, action: 'auth.password.change', ip: req.ip }, req.log);
    return reply.status(204).send();
  });
};
