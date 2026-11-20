import { OwlLogo } from '@/components/logo';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass-strong p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <OwlLogo className="h-10 w-10" />
            <h1 className="mt-4 text-2xl font-light tracking-tight text-white">Young Owl</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your lab</p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized lab use only. Activity is logged.
        </p>
      </div>
    </main>
  );
}
