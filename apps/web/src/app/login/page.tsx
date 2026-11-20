import { OwlLogo } from '@/components/logo';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <OwlLogo className="h-14 w-14" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">YOUNG OWL</h1>
          <p className="mt-1 text-sm text-slate-400">Cybersecurity learning &amp; lab platform</p>
        </div>
        <div className="rounded-xl border border-navy-700/70 bg-navy-900/80 p-6 shadow-glow backdrop-blur">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized lab use only. All activity is logged.
        </p>
      </div>
    </main>
  );
}
