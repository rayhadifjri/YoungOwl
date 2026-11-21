import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { Markdown } from '@/components/markdown';
import { LessonComplete } from './lesson-complete';

export const dynamic = 'force-dynamic';

interface Lesson {
  id: string;
  title: string;
  contentMarkdown: string;
  estimatedMinutes: number;
  completed: boolean;
  module: { slug: string; title: string };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const l = await apiGet<Lesson>(`/learning/lessons/${lessonId}`);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/learning/${slug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {l.module.title}
      </Link>

      <article className="glass px-6 py-6 sm:px-8">
        <Markdown content={l.contentMarkdown} />
      </article>

      <LessonComplete lessonId={l.id} moduleSlug={slug} initiallyComplete={l.completed} />
    </div>
  );
}
