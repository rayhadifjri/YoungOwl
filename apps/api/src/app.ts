import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { Prisma } from '@young-owl/database';
import type { Config } from './config.js';
import { AppError } from './lib/errors.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './modules/auth/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { systemRoutes } from './modules/system/routes.js';
import { labRoutes } from './modules/labs/routes.js';
import { targetRoutes } from './modules/targets/routes.js';
import { assessmentRoutes } from './modules/assessments/routes.js';
import { vulnerabilityRoutes } from './modules/vulnerabilities/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { docsRoutes } from './modules/docs/routes.js';
import { learningRoutes } from './modules/learning/routes.js';
import { vulnLabRoutes } from './modules/vuln-lab/routes.js';

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
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        return reply
          .status(409)
          .send({ error: { code: 'CONFLICT', message: `That ${fields} is already in use.` } });
      }
      if (err.code === 'P2025') {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
      }
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
      await v1.register(systemRoutes, { vulnMode: config.VULN_MODE });
      await v1.register(labRoutes);
      await v1.register(targetRoutes);
      await v1.register(assessmentRoutes);
      await v1.register(vulnerabilityRoutes);
      await v1.register(reportRoutes);
      await v1.register(userRoutes);
      await v1.register(auditRoutes);
      await v1.register(docsRoutes);
      await v1.register(learningRoutes);
      // Deliberately vulnerable endpoints. Only ever loaded in lab mode.
      if (config.VULN_MODE) {
        app.log.warn('VULN_MODE is on: this API is intentionally vulnerable. Lab use only.');
        await v1.register(vulnLabRoutes, { config });
      }
    },
    { prefix: '/api/v1' },
  );

  return app;
}
