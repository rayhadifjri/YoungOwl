import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-20">
      <div className="glass px-8 py-12 text-center">
        <h1 className="text-2xl font-light tracking-tight text-slate-900">Not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
