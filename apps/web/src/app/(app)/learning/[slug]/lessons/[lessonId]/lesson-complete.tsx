'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { apiPost } from '@/lib/api-client';

export function LessonComplete({
  lessonId,
  moduleSlug,
  initiallyComplete,
}: {
  lessonId: string;
  moduleSlug: string;
  initiallyComplete: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyComplete);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      {done ? (
        <span className="inline-flex items-center gap-2 text-sm text-emerald-600">
          <Check className="h-4 w-4" /> Completed
        </span>
      ) : (
        <span className="text-sm text-slate-400">Mark this lesson done when you finish.</span>
      )}
      <div className="flex items-center gap-4">
        <Link
          href={`/learning/${moduleSlug}`}
          className="text-sm text-cyan-700 hover:underline"
          prefetch={false}
        >
          Back to module
        </Link>
        <button
          disabled={busy || done}
          onClick={async () => {
            setBusy(true);
            const res = await apiPost(`/learning/lessons/${lessonId}/complete`);
            setBusy(false);
            if (res.ok) {
              setDone(true);
              router.refresh();
            }
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {done ? 'Done' : busy ? 'Saving…' : 'Mark complete'}
        </button>
      </div>
    </div>
  );
}
