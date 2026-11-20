import { prisma, type Prisma } from '@young-owl/database';
import {
  PERMISSIONS,
  securityScore,
  type DashboardSummary,
  type SessionUser,
  type Severity,
} from '@young-owl/shared';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getDashboardSummary(user: SessionUser): Promise<DashboardSummary> {
  // Users without read_all only see their own assessments and findings.
  const seesAll = user.permissions.includes(PERMISSIONS.ASSESSMENT_READ_ALL);
  const assessmentWhere: Prisma.AssessmentWhereInput = seesAll ? {} : { ownerId: user.id };
  const vulnWhere: Prisma.VulnerabilityWhereInput = {
    status: { in: ['OPEN', 'CONFIRMED'] },
    ...(seesAll ? {} : { assessment: { ownerId: user.id } }),
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setUTCDate(1);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
  sixMonthsAgo.setUTCHours(0, 0, 0, 0);

  const [
    laboratories,
    activeLaboratories,
    targets,
    targetsOnline,
    assessments,
    vulnGroups,
    recentAssessments,
    activity,
    totalLessons,
    completedLessons,
    quizzesPassed,
  ] = await Promise.all([
    prisma.laboratory.count(),
    prisma.laboratory.count({ where: { isActive: true } }),
    prisma.target.count(),
    prisma.target.count({ where: { status: 'ONLINE' } }),
    prisma.assessment.count({ where: assessmentWhere }),
    prisma.vulnerability.groupBy({ by: ['severity'], where: vulnWhere, _count: { _all: true } }),
    prisma.assessment.findMany({
      where: { ...assessmentWhere, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: seesAll ? {} : { actorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { displayName: true } } },
    }),
    prisma.lesson.count({ where: { module: { isPublished: true } } }),
    prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } }),
    prisma.quizResult.count({ where: { userId: user.id, passed: true } }),
  ]);

  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const g of vulnGroups) bySeverity[g.severity as Severity] = g._count._all;

  const months: { month: string; count: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setUTCMonth(d.getUTCMonth() + i);
    months.push({ month: monthKey(d), count: 0 });
  }
  for (const a of recentAssessments) {
    const m = months.find((x) => x.month === monthKey(a.createdAt));
    if (m) m.count++;
  }

  let database: 'ok' | 'down' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }

  return {
    totals: {
      laboratories,
      activeLaboratories,
      targets,
      targetsOnline,
      assessments,
      openVulnerabilities: Object.values(bySeverity).reduce((a, b) => a + b, 0),
    },
    vulnerabilitiesBySeverity: bySeverity,
    assessmentsByMonth: months,
    recentActivity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.displayName ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    learning: {
      completedLessons,
      totalLessons,
      percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      quizzesPassed,
    },
    systemHealth: { database, api: 'ok', worker: 'not_configured' },
    securityScore: securityScore(bySeverity),
  };
}
