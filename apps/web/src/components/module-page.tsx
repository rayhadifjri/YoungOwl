import { PageHeader } from '@/components/ui/form';
import { Pill } from '@/components/ui/badge';
import { Markdown } from '@/components/markdown';
import type { ModuleContent } from '@/lib/modules';

/**
 * Renders a guided training module (Reconnaissance … Evasion). Content is trusted and authored in
 * `@/lib/modules`; the lab target reminder keeps operators pointed at the :8080 copy, never the
 * control center they are reading this in.
 */
export function ModulePage({ module }: { module: ModuleContent }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={module.title} subtitle={module.summary} />
      <div className="flex flex-wrap items-center gap-2">
        {module.level && <Pill className="text-cyan-700">{module.level}</Pill>}
        <Pill>Target: the isolated lab copy on :8080 — never this control center</Pill>
      </div>
      <article className="glass p-6 sm:p-8">
        <Markdown content={module.body} />
      </article>
    </div>
  );
}
