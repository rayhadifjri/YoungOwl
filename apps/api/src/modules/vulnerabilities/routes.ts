import type { FastifyPluginAsync } from 'fastify';
import { prisma, type Prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  cvssBaseScore,
  idParamSchema,
  severityFromScore,
  sortFindings,
  vulnerabilityCreateSchema,
  vulnerabilityUpdateSchema,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { AppError, NotFound } from '../../lib/errors.js';
import { route } from '../../lib/route.js';
import { loadAssessment, loadAssessmentForWrite } from '../assessments/access.js';

const asJson = <T extends { cvssScore: Prisma.Decimal | null }>(v: T) => ({
  ...v,
  cvssScore: v.cvssScore === null ? null : Number(v.cvssScore),
});

/** A CVSS vector wins: score and severity are derived from it so they can't disagree. */
function scoring(input: { cvssVector?: string | null; severity?: string }) {
  if (input.cvssVector) {
    const score = cvssBaseScore(input.cvssVector);
    return { cvssVector: input.cvssVector, cvssScore: score, severity: severityFromScore(score) };
  }
  if (input.cvssVector === null) return { cvssVector: null, cvssScore: null };
  return {};
}

export const vulnerabilityRoutes: FastifyPluginAsync = async (app) => {
  route(
    app,
    {
      method: 'GET',
      url: '/assessments/:id/vulnerabilities',
      tag: 'Findings',
      summary: 'Findings of an assessment',
      access: [P.ASSESSMENT_READ],
      params: idParamSchema,
    },
    async ({ params, user }) => {
      await loadAssessment(user, params.id);
      const rows = await prisma.vulnerability.findMany({ where: { assessmentId: params.id } });
      return { data: sortFindings(rows.map(asJson)) };
    },
  );

  route(
    app,
    {
      method: 'POST',
      url: '/assessments/:id/vulnerabilities',
      tag: 'Findings',
      summary: 'Add a finding (CVSS vector → score and severity)',
      access: [P.FINDING_WRITE],
      params: idParamSchema,
      body: vulnerabilityCreateSchema,
      status: 201,
    },
    async ({ params, body, user, req }) => {
      const a = await loadAssessmentForWrite(user, params.id);
      if (!body.cvssVector && !body.severity) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Give a CVSS vector or a severity.');
      }
      const v = await prisma.vulnerability.create({
        data: {
          ...body,
          severity: body.severity ?? 'INFO',
          ...scoring(body),
          assessmentId: a.id,
          targetId: a.targetId,
        },
      });
      await audit(
        {
          actorId: user.id,
          action: 'finding.create',
          entityType: 'vulnerability',
          entityId: v.id,
          ip: req.ip,
        },
        req.log,
      );
      return asJson(v);
    },
  );

  route(
    app,
    {
      method: 'PATCH',
      url: '/vulnerabilities/:id',
      tag: 'Findings',
      summary: 'Update a finding',
      access: [P.FINDING_WRITE],
      params: idParamSchema,
      body: vulnerabilityUpdateSchema,
    },
    async ({ params, body, user, req }) => {
      const v = await prisma.vulnerability.findUnique({ where: { id: params.id } });
      if (!v) throw NotFound('Finding');
      await loadAssessmentForWrite(user, v.assessmentId);
      const updated = await prisma.vulnerability.update({
        where: { id: v.id },
        data: { ...body, ...scoring(body) },
      });
      await audit(
        {
          actorId: user.id,
          action: 'finding.update',
          entityType: 'vulnerability',
          entityId: v.id,
          ip: req.ip,
          metadata: { status: body.status ?? null },
        },
        req.log,
      );
      return asJson(updated);
    },
  );
};
