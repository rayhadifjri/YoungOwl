import Link from 'next/link';
import { Download } from 'lucide-react';
import type { Paginated } from '@young-owl/shared';
import { apiGet } from '@/lib/api-server';
import { PageHeader } from '@/components/ui/form';
import { Pill } from '@/components/ui/badge';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface Report {
  id: string;
  title: string;
  format: string;
  generatedAt: string;
  author: { displayName: string };
  assessment: { id: string; title: string; target: { name: string } };
}

export default async function ReportsPage() {
  const res = await apiGet<Paginated<Report>>('/reports?pageSize=100');
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Reporting"
        subtitle="Report snapshots generated from assessments. PDF export arrives in Phase 5."
      />
      <div className="glass overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 text-left text-xs text-slate-400">
              <th className="px-6 py-3 font-normal">Report</th>
              <th className="px-3 py-3 font-normal">Assessment</th>
              <th className="px-3 py-3 font-normal">Format</th>
              <th className="px-3 py-3 font-normal">Generated</th>
              <th className="px-6 py-3 text-right font-normal" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {res.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  No reports yet. Generate one from an assessment.
                </td>
              </tr>
            )}
            {res.data.map((r) => (
              <tr key={r.id} className="hover:bg-white/40">
                <td className="px-6 py-3.5 font-medium text-slate-900">{r.title}</td>
                <td className="px-3 py-3.5">
                  <Link
                    href={`/assessments/${r.assessment.id}`}
                    className="text-slate-600 hover:text-cyan-700"
                  >
                    {r.assessment.title}
                  </Link>
                  <div className="text-[11px] text-slate-400">{r.assessment.target.name}</div>
                </td>
                <td className="px-3 py-3.5">
                  <Pill>{r.format}</Pill>
                </td>
                <td className="px-3 py-3.5 text-xs text-slate-500">
                  {fmtDate(r.generatedAt, true)} · {r.author.displayName}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <a
                    href={`/api/v1/reports/${r.id}/download`}
                    className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
