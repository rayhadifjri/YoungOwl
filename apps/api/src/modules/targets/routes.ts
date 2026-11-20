import type { FastifyPluginAsync } from 'fastify';
import { prisma, type Prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  idParamSchema,
  ipInCidr,
  targetCreateSchema,
  targetQuerySchema,
  targetUpdateSchema,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError, NotFound } from '../../lib/errors.js';
import { pageArgs, paginated } from '../../lib/http.js';
import { route } from '../../lib/route.js';

/**
 * Scope rules (threat model T6/T7): a target's IP must sit inside its lab network,
 * and its base URL may only point at the target's own hostname or IP.
 */
function assertInScope(
  lab: { networkCidr: string },
  t: { hostname: string; ipAddress?: string | null; baseUrl?: string | null },
) {
  if (t.ipAddress && !ipInCidr(t.ipAddress, lab.networkCidr)) {
    throw new AppError(
      403,
      'OUT_OF_SCOPE',
      `IP ${t.ipAddress} is outside the lab network ${lab.networkCidr}.`,
    );
  }
  if (t.baseUrl) {
    const host = new URL(t.baseUrl).hostname;
    if (host !== t.hostname && host !== t.ipAddress) {
      throw new AppError(
        403,
        'OUT_OF_SCOPE',
        `Base URL must point at ${t.hostname}${t.ipAddress ? ` or ${t.ipAddress}` : ''}.`,
      );
    }
  }
}

export const targetRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/targets',
      tag: 'Targets',
      summary: 'List targets',
      access: [P.TARGET_READ],
      query: targetQuerySchema,
    },
    async ({ query }) => {
      const where: Prisma.TargetWhereInput = {
        laboratoryId: query.labId,
        status: query.status,
        difficulty: query.difficulty,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { hostname: { contains: query.q, mode: 'insensitive' } },
                { technology: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        prisma.target.findMany({
          where,
          orderBy: [{ laboratory: { name: 'asc' } }, { name: 'asc' }],
          include: {
            laboratory: { select: { id: true, name: true, isActive: true } },
            _count: { select: { assessments: true } },
          },
          ...pageArgs(query),
        }),
        prisma.target.count({ where }),
      ]);
      return paginated(data, total, query);
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/targets',
      tag: 'Targets',
      summary: 'Create a target',
      access: [P.TARGET_MANAGE],
      body: targetCreateSchema,
      status: 201,
    },
    async ({ body, user, req }) => {
      const lab = await prisma.laboratory.findUnique({ where: { id: body.laboratoryId } });
      if (!lab) throw NotFound('Laboratory');
      assertInScope(lab, body);
      const target = await prisma.target.create({ data: body });
      await audit(
        {
          actorId: user.id,
          action: 'target.create',
          entityType: 'target',
          entityId: target.id,
          ip: req.ip,
        },
        req.log,
      );
      return target;
    },
  );

  route(
    app,
    {
      method: 'GET',
      url: '/targets/:id',
      tag: 'Targets',
      summary: 'Target detail',
      access: [P.TARGET_READ],
      params: idParamSchema,
    },
    async ({ params }) => {
      const t = await prisma.target.findUnique({
        where: { id: params.id },
        include: {
          laboratory: true,
          _count: { select: { assessments: true, vulnerabilities: true } },
        },
      });
      if (!t) throw NotFound('Target');
      return t;
    },
  );

  route(
    app,
    {
      method: 'PATCH',
      url: '/targets/:id',
      tag: 'Targets',
      summary: 'Update a target',
      access: [P.TARGET_MANAGE],
      params: idParamSchema,
      body: targetUpdateSchema,
    },
    async ({ params, body, user, req }) => {
      const t = await prisma.target.findUnique({
        where: { id: params.id },
        include: { laboratory: true },
      });
      if (!t) throw NotFound('Target');
      assertInScope(t.laboratory, { ...t, ...body });
      const updated = await prisma.target.update({ where: { id: t.id }, data: body });
      await audit(
        {
          actorId: user.id,
          action: 'target.update',
          entityType: 'target',
          entityId: t.id,
          ip: req.ip,
          metadata: body,
        },
        req.log,
      );
      return updated;
    },
  );

  route(
    app,
    {
      method: 'DELETE',
      url: '/targets/:id',
      tag: 'Targets',
      summary: 'Delete a target without assessments',
      access: [P.TARGET_MANAGE],
      params: idParamSchema,
    },
    async ({ params, user, req }) => {
      const t = await prisma.target.findUnique({
        where: { id: params.id },
        include: { _count: { select: { assessments: true } } },
      });
      if (!t) throw NotFound('Target');
      if (t._count.assessments > 0) {
        throw new AppError(
          409,
          'CONFLICT',
          'This target has assessments. Set it to MAINTENANCE instead of deleting it.',
        );
      }
      await prisma.target.delete({ where: { id: t.id } });
      await audit(
        {
          actorId: user.id,
          action: 'target.delete',
          entityType: 'target',
          entityId: t.id,
          ip: req.ip,
          metadata: { name: t.name },
        },
        req.log,
      );
      return undefined;
    },
  );
};
