import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  idParamSchema,
  paginationSchema,
  renderReportMarkdown,
  reportCreateSchema,
  sortFindings,
  type ReportData,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { pageArgs, paginated, seesAll } from '../../lib/http.js';
import { route } from '../../lib/route.js';
import { loadAssessment } from '../assessments/access.js';

async function buildReportData(
  assessmentId: string,
  title: string,
  summary: string | null | undefined,
  author: string,
): Promise<ReportData> {
  const a = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { target: { include: { laboratory: true } }, vulnerabilities: true },
  });
  return {
    title,
    summary,
    generatedAt: new Date().toISOString(),
    author,
    assessment: {
      title: a.title,
      status: a.status,
      description: a.description,
      startedAt: a.startedAt?.toISOString() ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
    },
    target: {
      name: a.target.name,
      hostname: a.target.hostname,
      ipAddress: a.target.ipAddress,
      technology: a.target.technology,
      laboratory: a.target.laboratory.name,
    },
    findings: sortFindings(
      a.vulnerabilities.map((v) => ({
        ...v,
        cvssScore: v.cvssScore === null ? null : Number(v.cvssScore),
      })),
    ),
  };
}

export const reportRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/reports',
      tag: 'Reports',
      summary: 'List reports',
      access: [P.REPORT_READ],
      query: paginationSchema,
    },
    async ({ query, user }) => {
      const where = seesAll(user) ? {} : { assessment: { ownerId: user.id } };
      const [data, total] = await Promise.all([
        prisma.report.findMany({
          where,
          orderBy: { generatedAt: 'desc' },
          omit: { content: true },
          include: {
            author: { select: { displayName: true } },
            assessment: { select: { id: true, title: true, target: { select: { name: true } } } },
          },
          ...pageArgs(query),
        }),
        prisma.report.count({ where }),
      ]);
      return paginated(data, total, query);
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/assessments/:id/reports',
      tag: 'Reports',
      summary: 'Generate a report snapshot (Markdown or JSON)',
      access: [P.REPORT_CREATE],
      params: idParamSchema,
      body: reportCreateSchema,
      status: 201,
    },
    async ({ params, body, user, req }) => {
      const a = await loadAssessment(user, params.id);
      const title = body.title ?? `${a.title} — report`;
      const data = await buildReportData(a.id, title, body.summary, user.displayName);
      const content =
        body.format === 'JSON' ? JSON.stringify(data, null, 2) : renderReportMarkdown(data);
      const report = await prisma.report.create({
        data: {
          assessmentId: a.id,
          authorId: user.id,
          title,
          summary: body.summary,
          format: body.format,
          content,
        },
        omit: { content: true },
      });
      await audit(
        {
          actorId: user.id,
          action: 'report.create',
          entityType: 'report',
          entityId: report.id,
          ip: req.ip,
        },
        req.log,
      );
      return report;
    },
  );

  route(
    app,
    {
      method: 'GET',
      url: '/reports/:id/download',
      tag: 'Reports',
      summary: 'Download a report file',
      access: [P.REPORT_READ],
      params: idParamSchema,
    },
    async ({ params, user, reply }) => {
      const r = await prisma.report.findUnique({ where: { id: params.id } });
      if (!r) throw new AppError(404, 'NOT_FOUND', 'Report not found.');
      await loadAssessment(user, r.assessmentId); // same visibility as the assessment
      if (!r.content)
        throw new AppError(
          409,
          'NOT_AVAILABLE',
          'This report has no stored content. PDF export arrives in Phase 5.',
        );
      const ext = r.format === 'JSON' ? 'json' : 'md';
      const type = r.format === 'JSON' ? 'application/json' : 'text/markdown';
      const safe =
        r.title
          .replace(/[^a-z0-9-_ ]/gi, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 80) || 'report';
      reply
        .header('content-type', `${type}; charset=utf-8`)
        .header('content-disposition', `attachment; filename="${safe}.${ext}"`)
        .header('x-content-type-options', 'nosniff');
      return reply.send(r.content);
    },
  );
};
