import type { DashboardSummary } from '@young-owl/shared';
import { apiGet } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssessmentTrend, SeverityChart } from '@/components/dashboard/charts';
import { FadeIn } from '@/components/dashboard/fade-in';
import { ScoreRing } from '@/components/dashboard/score-ring';
import { cn, humanizeAction, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-slate-400">{label}</div>
        <div className="mt-3 text-4xl font-light tracking-tight text-white">{value}</div>
        <div className="mt-1 h-4 text-xs text-slate-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

function HealthRow({ name, status }: { name: string; status: string }) {
  const dot =
    status === 'ok' ? 'bg-emerald-300' : status === 'down' ? 'bg-rose-400' : 'bg-slate-600';
  const text = status === 'ok' ? 'Operational' : status === 'down' ? 'Down' : 'Not set up yet';
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-slate-300">{name}</span>
      <span className="flex items-center gap-2 text-xs text-slate-400">
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
        {text}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await apiGet<DashboardSummary>('/dashboard/summary');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="pb-2">
        <h1 className="text-3xl font-light tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Labs, assessments and findings at a glance.</p>
      </div>

      <FadeIn className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <Stat
          label="Lab environments"
          value={s.totals.laboratories}
          sub={`${s.totals.activeLaboratories} active`}
        />
        <Stat label="Targets" value={s.totals.targets} sub={`${s.totals.targetsOnline} online`} />
        <Stat label="Assessments" value={s.totals.assessments} />
        <Stat
          label="Open findings"
          value={s.totals.openVulnerabilities}
          sub={`${s.vulnerabilitiesBySeverity.CRITICAL} critical`}
        />
      </FadeIn>

      <div className="grid gap-5 lg:grid-cols-3">
        <FadeIn delay={0.05} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Assessments · last 6 months</CardTitle>
            </CardHeader>
            <CardContent>
              <AssessmentTrend data={s.assessmentsByMonth} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Security score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <ScoreRing score={s.securityScore} />
              <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                100 minus weighted open findings
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FadeIn delay={0.15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Open findings by severity</CardTitle>
            </CardHeader>
            <CardContent>
              <SeverityChart data={s.vulnerabilitiesBySeverity} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {s.recentActivity.length === 0 && (
                <div className="py-6 text-sm text-slate-500">No activity yet.</div>
              )}
              <ul className="divide-y divide-white/[0.05]">
                {s.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 py-2.5 text-sm">
                    <span className="w-16 shrink-0 font-mono text-[11px] text-slate-500">
                      {timeAgo(a.createdAt)}
                    </span>
                    <span className="truncate text-slate-200">{humanizeAction(a.action)}</span>
                    <span className="ml-auto truncate text-xs text-slate-500">
                      {a.actor ?? 'anonymous'}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FadeIn delay={0.25}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Your learning progress</CardTitle>
              <span className="text-xs text-slate-500">
                {s.learning.completedLessons}/{s.learning.totalLessons} lessons ·{' '}
                {s.learning.quizzesPassed} quizzes
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-light tracking-tight text-white">
                {s.learning.percent}%
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{ width: `${Math.max(s.learning.percent, 1)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.3}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>System health</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.05] pt-2">
              <HealthRow name="API" status={s.systemHealth.api} />
              <HealthRow name="Database" status={s.systemHealth.database} />
              <HealthRow name="Kali worker" status={s.systemHealth.worker} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
