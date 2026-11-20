import type { DashboardSummary } from '@young-owl/shared';
import {
  Activity,
  Bug,
  Crosshair,
  FlaskConical,
  ShieldCheck,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssessmentTrend, SeverityChart } from '@/components/dashboard/charts';
import { FadeIn } from '@/components/dashboard/fade-in';
import { ScoreRing } from '@/components/dashboard/score-ring';
import { cn, humanizeAction, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Bug;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-5">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        <div className="rounded-lg bg-cyan-500/10 p-2 ring-1 ring-cyan-400/20">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  name,
  status,
}: {
  icon: typeof Bug;
  name: string;
  status: string;
}) {
  const tone =
    status === 'ok'
      ? 'text-emerald-400 bg-emerald-400'
      : status === 'down'
        ? 'text-rose-400 bg-rose-400'
        : 'text-slate-500 bg-slate-500';
  const text = status === 'ok' ? 'Operational' : status === 'down' ? 'Down' : 'Not set up yet';
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="flex items-center gap-2 text-slate-300">
        <Icon className="h-4 w-4 text-slate-500" />
        {name}
      </span>
      <span className={cn('flex items-center gap-2 text-xs', tone.split(' ')[0])}>
        <span className={cn('h-1.5 w-1.5 rounded-full', tone.split(' ')[1])} />
        {text}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await apiGet<DashboardSummary>('/dashboard/summary');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Command Center</h1>
        <p className="text-sm text-slate-400">Labs, assessments and findings at a glance.</p>
      </div>

      <FadeIn className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={FlaskConical}
          label="Lab environments"
          value={s.totals.laboratories}
          sub={`${s.totals.activeLaboratories} active`}
        />
        <Stat
          icon={Crosshair}
          label="Targets"
          value={s.totals.targets}
          sub={`${s.totals.targetsOnline} online`}
        />
        <Stat icon={ShieldCheck} label="Assessments" value={s.totals.assessments} />
        <Stat
          icon={Bug}
          label="Open findings"
          value={s.totals.openVulnerabilities}
          sub={`${s.vulnerabilitiesBySeverity.CRITICAL} critical`}
        />
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.05} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Assessments, last 6 months</CardTitle>
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
            <CardContent>
              <ScoreRing score={s.securityScore} />
              <p className="mt-3 text-center text-xs text-slate-500">
                100 minus weighted open findings (critical 15, high 8, medium 3, low 1).
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
              <Activity className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-navy-800 bg-navy-950/80 p-3 font-mono text-xs">
                {s.recentActivity.length === 0 && (
                  <div className="text-slate-500">$ no activity yet</div>
                )}
                {s.recentActivity.map((a) => (
                  <div key={a.id} className="flex gap-3 py-1">
                    <span className="w-16 shrink-0 text-slate-600">{timeAgo(a.createdAt)}</span>
                    <span className="text-cyan-400">{a.actor ?? 'anonymous'}</span>
                    <span className="truncate text-slate-300">{humanizeAction(a.action)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.25}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Your learning progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-semibold text-white">{s.learning.percent}%</div>
                <div className="text-xs text-slate-400">
                  {s.learning.completedLessons} / {s.learning.totalLessons} lessons ·{' '}
                  {s.learning.quizzesPassed} quizzes passed
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-electric"
                  style={{ width: `${s.learning.percent}%` }}
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
            <CardContent className="divide-y divide-navy-800">
              <HealthRow icon={Server} name="API" status={s.systemHealth.api} />
              <HealthRow icon={Database} name="Database" status={s.systemHealth.database} />
              <HealthRow icon={Cpu} name="Kali worker" status={s.systemHealth.worker} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
