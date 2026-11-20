import type { Paginated } from '@young-owl/shared';
import { apiGet } from '@/lib/api-server';
import { can, getMe } from '@/lib/session';
import { PageHeader } from '@/components/ui/form';
import { Pill, StatusDot } from '@/components/ui/badge';
import { titleCase } from '@/lib/format';
import { AddTargetButton, StartAssessmentButton, TargetStatusSelect } from './target-actions';

export const dynamic = 'force-dynamic';

export interface Lab {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string;
  networkCidr: string;
  isActive: boolean;
  _count: { targets: number; assessments: number };
}
interface Target {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string | null;
  baseUrl: string | null;
  appType: string;
  technology: string | null;
  difficulty: string;
  status: string;
  allowsIntrusive: boolean;
  laboratory: { id: string; name: string; isActive: boolean };
  _count: { assessments: number };
}

export default async function TargetsPage() {
  const [me, labs, targets] = await Promise.all([
    getMe(),
    apiGet<{ data: Lab[] }>('/labs'),
    apiGet<Paginated<Target>>('/targets?pageSize=100'),
  ]);
  const manage = can(me, 'target:manage');
  const startable = can(me, 'assessment:create');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Targets"
        subtitle="Intentionally vulnerable systems inside the lab networks."
        action={manage ? <AddTargetButton labs={labs.data} /> : null}
      />

      {labs.data.map((lab) => {
        const rows = targets.data.filter((t) => t.laboratory.id === lab.id);
        return (
          <section key={lab.id} className="glass overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-slate-900">{lab.name}</h2>
                  <Pill>{titleCase(lab.difficulty)}</Pill>
                  {!lab.isActive && <Pill className="text-orange-600">Inactive</Pill>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{lab.description}</p>
              </div>
              <code className="rounded-lg bg-white/70 px-2 py-1 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200/70">
                {lab.networkCidr}
              </code>
            </div>
            {rows.length === 0 && (
              <p className="px-6 py-6 text-sm text-slate-400">No targets yet.</p>
            )}
            <ul className="divide-y divide-slate-200/60">
              {rows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
                  <div className="min-w-[220px] flex-1">
                    <div className="text-sm font-medium text-slate-900">{t.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {t.hostname}
                      {t.ipAddress && ` · ${t.ipAddress}`}
                    </div>
                  </div>
                  <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-1.5">
                    <Pill>{t.appType}</Pill>
                    <Pill>{titleCase(t.difficulty)}</Pill>
                    {t.technology && <Pill className="max-w-[220px] truncate">{t.technology}</Pill>}
                    {t.allowsIntrusive && <Pill className="text-rose-600">Intrusive OK</Pill>}
                  </div>
                  <div className="w-32">
                    {manage ? (
                      <TargetStatusSelect id={t.id} status={t.status} />
                    ) : (
                      <StatusDot status={t.status} />
                    )}
                  </div>
                  <div className="w-24 text-xs text-slate-400">
                    {t._count.assessments} assessments
                  </div>
                  {startable && (
                    <StartAssessmentButton
                      targetId={t.id}
                      targetName={t.name}
                      disabled={!lab.isActive || t.status === 'MAINTENANCE'}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
