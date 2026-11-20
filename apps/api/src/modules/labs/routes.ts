import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  idParamSchema,
  ipInCidr,
  labCreateSchema,
  labUpdateSchema,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError, NotFound } from '../../lib/errors.js';
import { route } from '../../lib/route.js';

export const labRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/labs',
      tag: 'Labs',
      summary: 'List laboratories',
      access: [P.LAB_READ],
    },
    async () => {
      const labs = await prisma.laboratory.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { targets: true, assessments: true } } },
      });
      return { data: labs };
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/labs',
      tag: 'Labs',
      summary: 'Create a laboratory',
      access: [P.LAB_MANAGE],
      body: labCreateSchema,
      status: 201,
    },
    async ({ body, user, req }) => {
      const lab = await prisma.laboratory.create({ data: body });
      await audit(
        {
          actorId: user.id,
          action: 'lab.create',
          entityType: 'laboratory',
          entityId: lab.id,
          ip: req.ip,
        },
        req.log,
      );
      return lab;
    },
  );

  route(
    app,
    {
      method: 'GET',
      url: '/labs/:id',
      tag: 'Labs',
      summary: 'Laboratory with its targets',
      access: [P.LAB_READ],
      params: idParamSchema,
    },
    async ({ params }) => {
      const lab = await prisma.laboratory.findUnique({
        where: { id: params.id },
        include: { targets: { orderBy: { name: 'asc' } } },
      });
      if (!lab) throw NotFound('Laboratory');
      return lab;
    },
  );

  route(
    app,
    {
      method: 'PATCH',
      url: '/labs/:id',
      tag: 'Labs',
      summary: 'Update a laboratory',
      access: [P.LAB_MANAGE],
      params: idParamSchema,
      body: labUpdateSchema,
    },
    async ({ params, body, user, req }) => {
      const lab = await prisma.laboratory.findUnique({
        where: { id: params.id },
        include: { targets: true },
      });
      if (!lab) throw NotFound('Laboratory');
      if (body.networkCidr) {
        const outside = lab.targets.filter(
          (t) => t.ipAddress && !ipInCidr(t.ipAddress, body.networkCidr!),
        );
        if (outside.length) {
          throw new AppError(
            409,
            'CONFLICT',
            `Targets outside the new network: ${outside.map((t) => t.name).join(', ')}`,
          );
        }
      }
      const updated = await prisma.laboratory.update({ where: { id: params.id }, data: body });
      await audit(
        {
          actorId: user.id,
          action: 'lab.update',
          entityType: 'laboratory',
          entityId: lab.id,
          ip: req.ip,
          metadata: body,
        },
        req.log,
      );
      return updated;
    },
  );
};
