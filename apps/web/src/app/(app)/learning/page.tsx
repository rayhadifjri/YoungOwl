import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { PageHeader } from '@/components/ui/form';
import { Pill } from '@/components/ui/badge';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  lessonCount: number;
  completedLessons: number;
  quizPassed: boolean;
}

const ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default async function LearningPage() {
  const { data } = await apiGet<{ data: ModuleRow[] }>('/learning/modules');
  const totalLessons = data.reduce((a, m) => a + m.lessonCount, 0);
  const doneLessons = data.reduce((a, m) => a + m.completedLessons, 0);
  const groups = ORDER.map((d) => ({ level: d, mods: data.filter((m) => m.difficulty === d) }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Learning Center"
        subtitle={`Lessons and quizzes from beginner to advanced. ${doneLessons}/${totalLessons} lessons done.`}
      />

      {groups.map(
        ({ level, mods }) =>
          mods.length > 0 && (
            <section key={level} className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {titleCase(level)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {mods.map((m) => {
                  const pct = m.lessonCount
                    ? Math.round((m.completedLessons / m.lessonCount) * 100)
                    : 0;
                  return (
                    <Link
                      key={m.id}
                      href={`/learning/${m.slug}`}
                      className="glass group flex flex-col gap-3 p-5 transition hover:bg-white/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 shadow-sm">
                          <GraduationCap className="h-4 w-4 text-cyan-600" strokeWidth={1.75} />
                        </div>
                        {m.quizPassed && <Pill className="text-emerald-600">Quiz passed</Pill>}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">{m.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.description}</p>
                      </div>
                      <div className="mt-auto">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {m.completedLessons}/{m.lessonCount} lessons
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                          <div
                            className="h-full rounded-full bg-cyan-500/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
