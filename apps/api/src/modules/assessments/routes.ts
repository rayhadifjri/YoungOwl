import type { FastifyPluginAsync } from 'fastify';
import { prisma, type Prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  assessmentCreateSchema,
  assessmentQuerySchema,
  assessmentUpdateSchema,
  idParamSchema,
  sortFindings,
  type Severity,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError, NotFound } from '../../lib/errors.js';
import { pageArgs, paginated, seesAll } from '../../lib/http.js';
import { route } from '../../lib/route.js';
import { loadAssessment, loadAssessmentForWrite } from './access.js';

const SEVS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/assessments',
      tag: 'Assessments',
      summary: 'Assessment history (own, or all for admin/instructor)',
      access: [P.ASSESSMENT_READ],
      query: assessmentQuerySchema,
    },
    async ({ query, user }) => {
      const where: Prisma.AssessmentWhereInput = {
        status: query.status,
        targetId: query.targetId,
        ...(seesAll(user) ? {} : { ownerId: user.id }),
      };
      const [rows, total] = await Promise.all([
        prisma.assessment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            target: { select: { id: true, name: true, hostname: true } },
            owner: { select: { id: true, displayName: true } },
            vulnerabilities: { select: { severity: true, status: true } },
          },
          ...pageArgs(query),
        }),
        prisma.assessment.count({ where }),
      ]);
      const data = rows.map(({ vulnerabilities, ...a }) => {
        const open = vulnerabilities.filter((v) => v.status === 'OPEN' || v.status === 'CONFIRMED');
        return {
          ...a,
          findings: {
            total: vulnerabilities.length,
            open: open.length,
            bySeverity: Object.fromEntries(
              SEVS.map((s) => [s, open.filter((v) => v.severity === s).length]),
            ),
          },
        };
      });
      return paginated(data, total, query);
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/assessments',
      tag: 'Assessments',
      summary: 'Start an assessment on a target',
      access: [P.ASSESSMENT_CREATE],
      body: assessmentCreateSchema,
      status: 201,
    },
    async ({ body, user, req }) => {
      const target = await prisma.target.findUnique({
        where: { id: body.targetId },
        include: { laboratory: true },
      });
      if (!target) throw NotFound('Target');
      if (!target.laboratory.isActive)
        throw new AppError(409, 'CONFLICT', 'This laboratory is not active.');
      const a = await prisma.assessment.create({
        data: {
          title: body.title,
          description: body.description,
          targetId: target.id,
          laboratoryId: target.laboratoryId,
          ownerId: user.id,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
      await audit(
        {
          actorId: user.id,
          action: 'assessment.create',
          entityType: 'assessment',
          entityId: a.id,
          ip: req.ip,
        },
        req.log,
      );
      return a;
    },
  );

  route(
    app,
    {
      method: 'GET',
      url: '/assessments/:id',
      tag: 'Assessments',
      summary: 'Assessment detail with scans, findings and reports',
      access: [P.ASSESSMENT_READ],
      params: idParamSchema,
    },
    async ({ params, user }) => {
      await loadAssessment(user, params.id);
      const a = await prisma.assessment.findUniqueOrThrow({
        where: { id: params.id },
        include: {
          target: {
            include: { laboratory: { select: { id: true, name: true, networkCidr: true } } },
          },
          owner: { select: { id: true, displayName: true } },
          scanResults: { orderBy: { queuedAt: 'desc' }, take: 20, omit: { rawOutput: true } },
          vulnerabilities: true,
          reports: {
            orderBy: { generatedAt: 'desc' },
            omit: { content: true },
            include: { author: { select: { displayName: true } } },
          },
        },
      });
      const canEdit = a.ownerId === user.id || user.role === 'ADMIN';
      return {
        ...a,
        vulnerabilities: sortFindings(
          a.vulnerabilities.map((v) => ({
            ...v,
            cvssScore: v.cvssScore === null ? null : Number(v.cvssScore),
          })),
        ),
        canEdit,
      };
    },
  );

  route(
    app,
    {
      method: 'PATCH',
      url: '/assessments/:id',
      tag: 'Assessments',
      summary: 'Update title, description or status',
      access: [P.ASSESSMENT_UPDATE],
      params: idParamSchema,
      body: assessmentUpdateSchema,
    },
    async ({ params, body, user, req }) => {
      const a = await loadAssessmentForWrite(user, params.id);
      const data: Prisma.AssessmentUpdateInput = { ...body };
      if (body.status === 'COMPLETED' && !a.completedAt) data.completedAt = new Date();
      if (body.status === 'IN_PROGRESS') data.completedAt = null;
      if (body.status && body.status !== 'DRAFT' && !a.startedAt) data.startedAt = new Date();
      const updated = await prisma.assessment.update({ where: { id: a.id }, data });
      await audit(
        {
          actorId: user.id,
          action: 'assessment.update',
          entityType: 'assessment',
          entityId: a.id,
          ip: req.ip,
          metadata: body,
        },
        req.log,
      );
      return updated;
    },
  );
};
