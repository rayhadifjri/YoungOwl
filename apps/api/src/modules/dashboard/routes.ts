import type { FastifyPluginAsync } from 'fastify';
import { getDashboardSummary } from './service.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard/summary', { preHandler: app.requireAuth }, async (req) =>
    getDashboardSummary(req.user!),
  );
};
