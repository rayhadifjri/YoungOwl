import Link from 'next/link';
import type { Paginated } from '@young-owl/shared';
import { apiGet } from '@/lib/api-server';
import { PageHeader } from '@/components/ui/form';
import { fmtDate } from '@/lib/format';
import { humanizeAction } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Log {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  metadata: unknown;
  actor: { displayName: string; email: string } | null;
}

const GROUPS = ['all', 'auth.', 'assessment.', 'finding.', 'target.', 'report.', 'user.', 'lab.'];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const action = sp.action && GROUPS.includes(sp.action) ? sp.action : 'all';
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await apiGet<Paginated<Log>>(
    `/audit-logs?pageSize=50&page=${page}${action !== 'all' ? `&action=${encodeURIComponent(action)}` : ''}`,
  );
  const pages = Math.max(1, Math.ceil(res.meta.total / res.meta.pageSize));
  const href = (p: number) => `/audit?page=${p}${action !== 'all' ? `&action=${action}` : ''}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Audit log" subtitle="Every login and change, newest first." />
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <Link
            key={g}
            href={g === 'all' ? '/audit' : `/audit?action=${g}`}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition',
              action === g
                ? 'bg-slate-900 text-white'
                : 'bg-white/60 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white',
            )}
          >
            {g === 'all' ? 'All' : g.replace('.', '')}
          </Link>
        ))}
      </div>
      <div className="glass overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 text-left text-xs text-slate-400">
              <th className="px-6 py-3 font-normal">When</th>
              <th className="px-3 py-3 font-normal">Action</th>
              <th className="px-3 py-3 font-normal">Actor</th>
              <th className="px-3 py-3 font-normal">Entity</th>
              <th className="px-6 py-3 font-normal">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {res.data.map((l) => (
              <tr key={l.id} className="hover:bg-white/40">
                <td className="whitespace-nowrap px-6 py-3 text-xs text-slate-500">
                  {fmtDate(l.createdAt, true)}
                </td>
                <td
                  className={cn(
                    'px-3 py-3',
                    l.action.endsWith('failed') ? 'text-rose-600' : 'text-slate-800',
                  )}
                >
                  {humanizeAction(l.action)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {l.actor?.displayName ?? <span className="text-slate-400">anonymous</span>}
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                  {l.entityType ? `${l.entityType}/${l.entityId?.slice(-8) ?? ''}` : '—'}
                </td>
                <td className="px-6 py-3 font-mono text-[11px] text-slate-400">{l.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{res.meta.total} entries</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="rounded-full bg-white/60 px-3 py-1 ring-1 ring-slate-200/80"
              href={href(page - 1)}
            >
              Previous
            </Link>
          )}
          <span className="px-2 py-1">
            Page {page} / {pages}
          </span>
          {page < pages && (
            <Link
              className="rounded-full bg-white/60 px-3 py-1 ring-1 ring-slate-200/80"
              href={href(page + 1)}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
