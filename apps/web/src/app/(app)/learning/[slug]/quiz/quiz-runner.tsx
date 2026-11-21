'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  prompt: string;
  options: string[];
}
interface Feedback {
  id: string;
  correct: boolean;
  answerIndex: number;
  chosen: number | null;
  explanation: string;
}
interface Result {
  score: number;
  passed: boolean;
  passingScore: number;
  correct: number;
  total: number;
  feedback: Feedback[];
}

export function QuizRunner({ quizId, moduleSlug }: { quizId: string; moduleSlug: string }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/learning/quizzes/${quizId}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { questions: Question[] }) => setQuestions(d.questions))
      .catch(() => setError('Could not load the quiz.'));
  }, [quizId]);

  if (error) return <p className="glass px-5 py-4 text-sm text-rose-600">{error}</p>;
  if (!questions) return <p className="glass px-5 py-4 text-sm text-slate-400">Loading…</p>;

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  async function submit() {
    setBusy(true);
    setError(null);
    const ordered = questions!.map((_, i) => answers[i] ?? -1);
    const res = await apiPost<Result>(`/learning/quizzes/${quizId}/submit`, { answers: ordered });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError(res.error ?? 'Submission failed.');
  }

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={cn(
            'glass flex items-center justify-between px-5 py-4',
            result.passed ? 'ring-1 ring-emerald-200' : 'ring-1 ring-orange-200',
          )}
        >
          <div>
            <div className="text-2xl font-light text-slate-900">
              {result.score}%{' '}
              <span className={result.passed ? 'text-emerald-600' : 'text-orange-600'}>
                {result.passed ? 'Passed' : 'Not yet'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {result.correct}/{result.total} correct · pass at {result.passingScore}%
            </div>
          </div>
          {result.passed ? (
            <Link
              href={`/learning/${moduleSlug}`}
              className="text-sm text-cyan-700 hover:underline"
            >
              Back to module
            </Link>
          ) : (
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {questions.map((q, qi) => {
        const fb = result?.feedback.find((f) => f.id === q.id);
        return (
          <div key={q.id} className="glass px-5 py-4">
            <p className="mb-3 text-sm font-medium text-slate-900">
              {qi + 1}. {q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const isAnswer = fb && fb.answerIndex === oi;
                const isWrongChoice = fb && fb.chosen === oi && !fb.correct;
                return (
                  <label
                    key={oi}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition',
                      result
                        ? isAnswer
                          ? 'border-emerald-300 bg-emerald-50/60 text-slate-800'
                          : isWrongChoice
                            ? 'border-rose-300 bg-rose-50/60 text-slate-800'
                            : 'border-slate-200/70 text-slate-500'
                        : chosen
                          ? 'border-cyan-400/70 bg-white text-slate-900'
                          : 'border-slate-200/70 text-slate-600 hover:bg-white/60',
                    )}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      className="sr-only"
                      disabled={!!result}
                      checked={chosen}
                      onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    />
                    <span className="flex-1">{opt}</span>
                    {result && isAnswer && <Check className="h-4 w-4 text-emerald-600" />}
                    {result && isWrongChoice && <X className="h-4 w-4 text-rose-500" />}
                  </label>
                );
              })}
            </div>
            {fb && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium">Why:</span> {fb.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!result && (
        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <button
            disabled={!allAnswered || busy}
            onClick={submit}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : allAnswered ? 'Submit answers' : 'Answer all questions'}
          </button>
        </div>
      )}
    </div>
  );
}
