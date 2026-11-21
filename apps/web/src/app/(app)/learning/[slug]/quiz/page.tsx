import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { QuizRunner } from './quiz-runner';

export const dynamic = 'force-dynamic';

interface ModuleDetail {
  slug: string;
  title: string;
  quiz: { id: string; title: string; passingScore: number; questionCount: number } | null;
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await apiGet<ModuleDetail>(`/learning/modules/${slug}`);
  if (!m.quiz) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/learning/${slug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {m.title}
      </Link>
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">{m.quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {m.quiz.questionCount} questions · pass at {m.quiz.passingScore}%
        </p>
      </div>
      <QuizRunner quizId={m.quiz.id} moduleSlug={slug} />
    </div>
  );
}
