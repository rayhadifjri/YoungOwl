'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await apiPost<{ error?: { message: string } }>('/auth/login', {
      email: form.get('email'),
      password: form.get('password'),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.error?.message ?? 'Login failed.');
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  const input =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition focus:border-cyan-300/50 focus:bg-white/[0.06] focus:outline-none';

  return (
    <form onSubmit={onSubmit} method="post" className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs text-slate-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={input}
          placeholder="you@youngowl.lab"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs text-slate-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </div>
      {error && (
        <p
          role="alert"
          data-testid="login-error"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Sign in
      </Button>
    </form>
  );
}
