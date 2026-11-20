import type { FastifyPluginAsync } from 'fastify';
import { hash } from '@node-rs/argon2';
import { prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  idParamSchema,
  paginationSchema,
  userCreateSchema,
  userUpdateSchema,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError, NotFound } from '../../lib/errors.js';
import { pageArgs, paginated } from '../../lib/http.js';
import { route } from '../../lib/route.js';

const publicUser = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { name: true } },
} as const;

export const userRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/users',
      tag: 'Users',
      summary: 'List users',
      access: [P.USER_READ],
      query: paginationSchema,
    },
    async ({ query }) => {
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          select: publicUser,
          orderBy: { createdAt: 'asc' },
          ...pageArgs(query),
        }),
        prisma.user.count(),
      ]);
      return paginated(data, total, query);
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/users',
      tag: 'Users',
      summary: 'Create a user',
      access: [P.USER_CREATE],
      body: userCreateSchema,
      status: 201,
    },
    async ({ body, user, req }) => {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: body.role } });
      const created = await prisma.user.create({
        data: {
          email: body.email,
          username: body.username,
          displayName: body.displayName,
          roleId: role.id,
          passwordHash: await hash(body.password),
        },
        select: publicUser,
      });
      await audit(
        {
          actorId: user.id,
          action: 'user.create',
          entityType: 'user',
          entityId: created.id,
          ip: req.ip,
          metadata: { role: body.role },
        },
        req.log,
      );
      return created;
    },
  );

  route(
    app,
    {
      method: 'PATCH',
      url: '/users/:id',
      tag: 'Users',
      summary: 'Change role, name or active flag',
      access: [P.USER_UPDATE],
      params: idParamSchema,
      body: userUpdateSchema,
    },
    async ({ params, body, user, req }) => {
      const target = await prisma.user.findUnique({ where: { id: params.id } });
      if (!target) throw NotFound('User');
      if (
        target.id === user.id &&
        (body.isActive === false || (body.role && body.role !== user.role))
      ) {
        throw new AppError(
          409,
          'CONFLICT',
          'You cannot deactivate yourself or change your own role.',
        );
      }
      const roleId = body.role
        ? (await prisma.role.findUniqueOrThrow({ where: { name: body.role } })).id
        : undefined;
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: { displayName: body.displayName, isActive: body.isActive, roleId },
        select: publicUser,
      });
      // Role or status change: force a fresh login so new permissions apply immediately.
      if (roleId || body.isActive === false)
        await prisma.session.deleteMany({ where: { userId: target.id } });
      await audit(
        {
          actorId: user.id,
          action: 'user.update',
          entityType: 'user',
          entityId: target.id,
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
      method: 'GET',
      url: '/roles',
      tag: 'Users',
      summary: 'Roles with permissions',
      access: [P.ROLE_READ],
    },
    async () => {
      const roles = await prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: 'asc' },
      });
      return {
        data: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: r.permissions.map((p) => p.permission.key),
        })),
      };
    },
  );
};
