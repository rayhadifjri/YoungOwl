import { PageHeader } from '@/components/ui/form';
import { Pill } from '@/components/ui/badge';
import { Markdown } from '@/components/markdown';
import { AttackMonitor } from '@/components/attack-monitor';
import type { ModuleContent } from '@/lib/modules';

/**
 * An operator tab: a live attack monitor for the lab (filtered to this tab's categories), plus the
 * module's guide/detection notes in a collapsible panel. The monitor reads attacks the lab recorded
 * against the :8080 copy — never this control center.
 */
export function ModulePage({ module }: { module: ModuleContent }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={module.title} subtitle={module.summary} />
      <div className="flex flex-wrap items-center gap-2">
        {module.level && <Pill className="text-cyan-700">{module.level}</Pill>}
        <Pill>Memantau serangan terhadap lab :8080</Pill>
      </div>

      <AttackMonitor categories={module.monitorCategories} />

      <details className="glass px-5 py-4">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
          Panduan &amp; deteksi — {module.title}
        </summary>
        <div className="mt-3 border-t border-slate-200/70 pt-3">
          <Markdown content={module.body} />
        </div>
      </details>
    </div>
  );
}
