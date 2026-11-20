import type { FastifyPluginAsync } from 'fastify';
import { prisma, type Prisma } from '@young-owl/database';
import { PERMISSIONS as P, auditQuerySchema } from '@young-owl/shared';
import { pageArgs, paginated } from '../../lib/http.js';
import { route } from '../../lib/route.js';

export const auditRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/audit-logs',
      tag: 'Audit',
      summary: 'Audit trail',
      access: [P.AUDIT_READ],
      query: auditQuerySchema,
    },
    async ({ query }) => {
      const where: Prisma.AuditLogWhereInput = {
        actorId: query.actorId,
        ...(query.action ? { action: { startsWith: query.action } } : {}),
      };
      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { displayName: true, email: true } } },
          ...pageArgs(query),
        }),
        prisma.auditLog.count({ where }),
      ]);
      return paginated(data, total, query);
    },
  );
};
