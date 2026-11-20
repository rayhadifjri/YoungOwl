import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/system/health', { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    }
  });
};
