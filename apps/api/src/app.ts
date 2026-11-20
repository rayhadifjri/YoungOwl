import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import { AppError } from './lib/errors.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './modules/auth/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { systemRoutes } from './modules/system/routes.js';

export async function buildApp(config: Config) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Never log secrets (threat model T12).
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.headers["x-csrf-token"]',
        'res.headers["set-cookie"]',
      ],
      ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
    trustProxy: true,
    bodyLimit: 1_048_576,
    genReqId: () => crypto.randomUUID(),
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  await app.register(helmet, { contentSecurityPolicy: false }); // API returns JSON only
  await app.register(cookie);
  await app.register(authPlugin);
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.user?.id ?? req.ip,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: { code: 'RATE_LIMITED', message: `Too many requests. Try again in ${ctx.after}.` },
    }),
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.issues },
      });
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) return reply.status(429).send(err);
    if (status && status < 500) {
      return reply
        .status(status)
        .send({ error: { code: 'BAD_REQUEST', message: (err as Error).message } });
    }
    req.log.error({ err }, 'unhandled error');
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL', message: 'Something went wrong.' } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }),
  );

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { config });
      await v1.register(dashboardRoutes);
      await v1.register(systemRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
