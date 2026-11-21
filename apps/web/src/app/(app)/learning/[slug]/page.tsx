import Link from 'next/link';
import { ArrowLeft, Check, CircleHelp, FileText } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { Pill } from '@/components/ui/badge';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface ModuleDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  lessons: {
    id: string;
    slug: string;
    title: string;
    estimatedMinutes: number;
    completed: boolean;
  }[];
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    questionCount: number;
    best: { score: number; passed: boolean } | null;
  } | null;
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await apiGet<ModuleDetail>(`/learning/modules/${slug}`);
  const done = m.lessons.filter((l) => l.completed).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/learning"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Learning Center
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-light tracking-tight text-slate-900">{m.title}</h1>
          <Pill>{titleCase(m.difficulty)}</Pill>
        </div>
        <p className="mt-1 text-sm text-slate-500">{m.description}</p>
      </div>

      <section className="glass divide-y divide-slate-200/60">
        {m.lessons.map((l, i) => (
          <Link
            key={l.id}
            href={`/learning/${m.slug}/lessons/${l.id}`}
            className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/60"
          >
            <span
              className={
                l.completed
                  ? 'grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white'
                  : 'grid h-6 w-6 place-items-center rounded-full bg-slate-200/80 text-[11px] text-slate-500'
              }
            >
              {l.completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm text-slate-800">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                {l.title}
              </div>
            </div>
            <span className="text-[11px] text-slate-400">{l.estimatedMinutes} min</span>
          </Link>
        ))}
      </section>

      {m.quiz && (
        <Link
          href={`/learning/${m.slug}/quiz`}
          className="glass flex items-center gap-4 px-5 py-4 transition hover:bg-white/60"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 shadow-sm">
            <CircleHelp className="h-4 w-4 text-cyan-600" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">{m.quiz.title}</div>
            <div className="text-xs text-slate-500">
              {m.quiz.questionCount} questions · pass at {m.quiz.passingScore}%
              {done < m.lessons.length ? ' · finish the lessons first for the best shot' : ''}
            </div>
          </div>
          {m.quiz.best &&
            (m.quiz.best.passed ? (
              <Pill className="text-emerald-600">Passed · {m.quiz.best.score}%</Pill>
            ) : (
              <Pill className="text-orange-600">Best {m.quiz.best.score}%</Pill>
            ))}
        </Link>
      )}
    </div>
  );
}
