import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';

export const systemRoutes: FastifyPluginAsync<{ vulnMode: boolean }> = async (app, opts) => {
  app.get('/system/health', { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', vulnMode: opts.vulnMode };
    } catch {
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    }
  });
};
