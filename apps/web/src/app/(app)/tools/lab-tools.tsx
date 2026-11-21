'use client';

// Lab mode UI. The endpoints behind these forms are intentionally vulnerable (docs/lab-mode.md).
import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/form';

const btn =
  'rounded-xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-60';
const out =
  'max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200/70';

export function TargetSearch() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target search</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`/api/v1/targets/search?q=${encodeURIComponent(q)}`);
            setResult(JSON.stringify(await res.json(), null, 2));
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="juice" name="q" />
          <button className={btn}>Search</button>
        </form>
        {result && <pre className={`${out} mt-3`}>{result}</pre>}
      </CardContent>
    </Card>
  );
}

export function HostLookup() {
  const [host, setHost] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Host lookup</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await apiPost<{ output: string }>('/tools/lookup', { host });
            setResult(res.ok ? res.data.output : (res.error ?? 'Lookup failed.'));
            setBusy(false);
          }}
        >
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="localhost"
            name="host"
          />
          <button className={btn} disabled={busy}>
            Look up
          </button>
        </form>
        {result !== null && <pre className={`${out} mt-3`}>{result || '(no output)'}</pre>}
      </CardContent>
    </Card>
  );
}

export function FileShare() {
  const [files, setFiles] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/v1/files')
      .then((r) => r.json())
      .then((d: { data?: string[] }) => setFiles(d.data ?? []))
      .catch(() => setFiles([]));
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared files</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {files.map((f) => (
            <li key={f}>
              <a
                className="font-mono text-xs text-cyan-700 hover:underline"
                href={`/api/v1/files?name=${encodeURIComponent(f)}`}
                target="_blank"
                rel="noreferrer"
              >
                {f}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
