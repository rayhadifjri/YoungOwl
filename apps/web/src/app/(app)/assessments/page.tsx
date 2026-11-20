import Link from 'next/link';
import type { Paginated } from '@young-owl/shared';
import { apiGet } from '@/lib/api-server';
import { PageHeader } from '@/components/ui/form';
import { SeverityBadge, StatusDot } from '@/components/ui/badge';
import { fmtDate, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  target: { id: string; name: string; hostname: string };
  owner: { id: string; displayName: string };
  findings: { total: number; open: number; bySeverity: Record<string, number> };
}

const FILTERS = ['ALL', 'IN_PROGRESS', 'COMPLETED', 'DRAFT', 'ARCHIVED'];

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status && FILTERS.includes(status) ? status : 'ALL';
  const res = await apiGet<Paginated<Row>>(
    `/assessments?pageSize=100${active !== 'ALL' ? `&status=${active}` : ''}`,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Assessments"
        subtitle="History of security assessments and their findings."
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'ALL' ? '/assessments' : `/assessments?status=${f}`}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition',
              active === f
                ? 'bg-slate-900 text-white'
                : 'bg-white/60 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white',
            )}
          >
            {f === 'ALL' ? 'All' : titleCase(f)}
          </Link>
        ))}
      </div>

      <div className="glass overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 text-left text-xs text-slate-400">
              <th className="px-6 py-3 font-normal">Assessment</th>
              <th className="px-3 py-3 font-normal">Owner</th>
              <th className="px-3 py-3 font-normal">Status</th>
              <th className="px-3 py-3 font-normal">Open findings</th>
              <th className="px-6 py-3 text-right font-normal">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {res.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  No assessments yet. Start one from the Targets page.
                </td>
              </tr>
            )}
            {res.data.map((a) => (
              <tr key={a.id} className="transition hover:bg-white/40">
                <td className="px-6 py-3.5">
                  <Link
                    href={`/assessments/${a.id}`}
                    className="font-medium text-slate-900 hover:text-cyan-700"
                  >
                    {a.title}
                  </Link>
                  <div className="font-mono text-[11px] text-slate-400">{a.target.hostname}</div>
                </td>
                <td className="px-3 py-3.5 text-slate-600">{a.owner.displayName}</td>
                <td className="px-3 py-3.5">
                  <StatusDot status={a.status} />
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {a.findings.open === 0 && <span className="text-xs text-slate-400">None</span>}
                    {Object.entries(a.findings.bySeverity)
                      .filter(([, n]) => n > 0)
                      .map(([sev, n]) => (
                        <span key={sev} className="inline-flex items-center gap-1">
                          <SeverityBadge severity={sev} />{' '}
                          <span className="text-xs text-slate-500">×{n}</span>
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-right text-xs text-slate-500">
                  {fmtDate(a.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{res.meta.total} assessment(s)</p>
    </div>
  );
}
