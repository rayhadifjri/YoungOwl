import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { can, getMe } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, SeverityBadge, StatusDot } from '@/components/ui/badge';
import { fmtDate } from '@/lib/format';
import { isLabMode } from '@/lib/lab';
import {
  AddFindingButton,
  AssessmentStatusSelect,
  FindingStatusSelect,
  GenerateReport,
} from './assessment-actions';

export const dynamic = 'force-dynamic';

export interface Finding {
  id: string;
  title: string;
  category: string;
  cwe: string | null;
  severity: string;
  cvssScore: number | null;
  cvssVector: string | null;
  description: string;
  evidence: string | null;
  remediation: string | null;
  status: string;
}
interface Detail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  canEdit: boolean;
  owner: { displayName: string };
  target: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string | null;
    baseUrl: string | null;
    technology: string | null;
    laboratory: { name: string; networkCidr: string };
  };
  scanResults: {
    id: string;
    toolProfile: string;
    status: string;
    queuedAt: string;
    finishedAt: string | null;
    parsed: { ports?: { port: number; service: string; version: string }[] } | null;
  }[];
  vulnerabilities: Finding[];
  reports: {
    id: string;
    title: string;
    format: string;
    generatedAt: string;
    author: { displayName: string };
  }[];
}

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, a] = await Promise.all([getMe(), apiGet<Detail>(`/assessments/${id}`)]);
  const editable = a.canEdit && can(me, 'finding:write');
  const labMode = isLabMode();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Assessments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">{a.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {a.target.name} · {a.owner.displayName} · started {fmtDate(a.startedAt ?? a.createdAt)}
            {a.completedAt && ` · completed ${fmtDate(a.completedAt)}`}
          </p>
          {labMode && (
            <a
              href={`/api/v1/assessments/${a.id}/export`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </a>
          )}
        </div>
        {a.canEdit && can(me, 'assessment:update') ? (
          <AssessmentStatusSelect id={a.id} status={a.status} />
        ) : (
          <StatusDot status={a.status} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Host" v={<code className="font-mono text-xs">{a.target.hostname}</code>} />
            <Row k="IP" v={a.target.ipAddress ?? '—'} />
            <Row k="URL" v={a.target.baseUrl ?? '—'} />
            <Row k="Stack" v={a.target.technology ?? '—'} />
            <Row k="Lab" v={`${a.target.laboratory.name} (${a.target.laboratory.networkCidr})`} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scans</CardTitle>
            <span className="text-xs text-slate-400">Live scans arrive in Phase 3</span>
          </CardHeader>
          <CardContent className="pt-2">
            {a.scanResults.length === 0 && (
              <p className="py-4 text-sm text-slate-400">No scans yet.</p>
            )}
            <ul className="divide-y divide-slate-200/60">
              {a.scanResults.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm"
                >
                  <code className="font-mono text-xs text-slate-700">{s.toolProfile}</code>
                  <StatusDot status={s.status} />
                  <span className="flex flex-wrap gap-1">
                    {s.parsed?.ports?.map((p) => (
                      <Pill key={p.port}>
                        {p.port}/{p.service}
                      </Pill>
                    ))}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {fmtDate(s.finishedAt ?? s.queuedAt, true)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({a.vulnerabilities.length})</CardTitle>
          {editable && <AddFindingButton assessmentId={a.id} />}
        </CardHeader>
        <CardContent className="pt-2">
          {a.vulnerabilities.length === 0 && (
            <p className="py-4 text-sm text-slate-400">No findings yet.</p>
          )}
          <div className="divide-y divide-slate-200/60">
            {a.vulnerabilities.map((f) => (
              <details key={f.id} className="group py-1">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/50">
                  <SeverityBadge severity={f.severity} score={f.cvssScore} />
                  <span className="flex-1 text-sm font-medium text-slate-900">{f.title}</span>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    {f.category}
                    {f.cwe ? ` · ${f.cwe}` : ''}
                  </span>
                  {editable ? (
                    <FindingStatusSelect id={f.id} status={f.status} />
                  ) : (
                    <StatusDot status={f.status} />
                  )}
                </summary>
                <div className="grid gap-4 px-2 pb-4 pt-2 text-sm md:grid-cols-3">
                  {labMode ? (
                    // Lab mode VULN (stored XSS): the description is rendered as raw HTML.
                    <Section title="Description">
                      <span dangerouslySetInnerHTML={{ __html: f.description }} />
                    </Section>
                  ) : (
                    <Section title="Description">{f.description}</Section>
                  )}
                  <Section title="Evidence" mono>
                    {f.evidence}
                  </Section>
                  <Section title="Remediation">{f.remediation}</Section>
                  {f.cvssVector && (
                    <p className="font-mono text-[11px] text-slate-400 md:col-span-3">
                      {f.cvssVector}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          {can(me, 'report:create') && <GenerateReport assessmentId={a.id} />}
        </CardHeader>
        <CardContent className="pt-2">
          {a.reports.length === 0 && <p className="py-4 text-sm text-slate-400">No reports yet.</p>}
          <ul className="divide-y divide-slate-200/60">
            {a.reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="flex-1 text-slate-800">{r.title}</span>
                <Pill>{r.format}</Pill>
                <span className="text-xs text-slate-400">
                  {r.author.displayName} · {fmtDate(r.generatedAt, true)}
                </span>
                {can(me, 'report:read') && (
                  <a
                    href={`/api/v1/reports/${r.id}/download`}
                    className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{k}</span>
      <span className="truncate text-right text-slate-700">{v}</span>
    </div>
  );
}

function Section({
  title,
  children,
  mono,
}: {
  title: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{title}</div>
      {children ? (
        <p
          className={
            mono
              ? 'whitespace-pre-wrap break-words rounded-xl bg-slate-900/[0.04] p-3 font-mono text-xs text-slate-700'
              : 'whitespace-pre-wrap text-slate-700'
          }
        >
          {children}
        </p>
      ) : (
        <p className="text-slate-400">—</p>
      )}
    </div>
  );
}
