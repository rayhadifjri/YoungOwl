/**
 * Read side of the attack monitor (runs on the control center). Serves the classified events the
 * lab copy wrote to the shared one-way log. Read-only; gated behind lab:read like the rest of the
 * lab-facing surface.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PERMISSIONS as P } from '@young-owl/shared';
import { route } from '../../lib/route.js';
import { MONITOR_CATEGORIES, type MonitorCategory } from './classify.js';
import { readEvents } from './store.js';

const querySchema = z.object({
  categories: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const monitorRoutes: FastifyPluginAsync<{ logPath: string }> = async (app, { logPath }) => {
  route(
    app,
    {
      method: 'GET',
      url: '/monitor/events',
      tag: 'Monitor',
      summary: 'Live attack-monitor events, newest first',
      access: [P.LAB_READ],
      query: querySchema,
    },
    async ({ query }) => {
      const cats = (query.categories ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((c): c is MonitorCategory => (MONITOR_CATEGORIES as readonly string[]).includes(c));
      const data = readEvents(logPath, {
        categories: cats.length ? cats : undefined,
        limit: query.limit,
      });
      return { enabled: Boolean(logPath), categories: MONITOR_CATEGORIES, data };
    },
  );
};
