'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MonitorEvent {
  ts: string;
  source: string;
  method: string;
  path: string;
  category: string;
  severity: string;
  signature: string;
  status: number;
}

const CATEGORY: Record<string, { label: string; cls: string }> = {
  rce: { label: 'RCE', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  sqli: { label: 'SQLi', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  traversal: { label: 'Traversal', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  idor: { label: 'IDOR', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  xss: { label: 'XSS', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  auth: { label: 'Auth', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  recon: { label: 'Recon', cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
};

const POLL_MS = 4000;

export function AttackMonitor({ categories }: { categories?: string[] }) {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(true);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    let active = true;
    const qs =
      categories && categories.length
        ? `?categories=${categories.join(',')}&limit=100`
        : '?limit=100';
    const tick = async () => {
      if (!liveRef.current) return;
      try {
        const res = await fetch(`/api/v1/monitor/events${qs}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { enabled: boolean; data: MonitorEvent[] };
        if (!active) return;
        setEnabled(body.enabled);
        setEvents(body.data);
        setError(false);
      } catch {
        if (active) setError(true);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [categories]);

  return (
    <section className="glass overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300',
            )}
          />
          <h2 className="text-sm font-medium text-slate-800">Monitor serangan langsung</h2>
          <span className="text-xs text-slate-400">{events.length} kejadian</span>
        </div>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className="rounded-lg px-2.5 py-1 text-xs text-slate-500 ring-1 ring-inset ring-slate-200/80 transition hover:bg-white/60"
        >
          {live ? 'Jeda' : 'Lanjutkan'}
        </button>
      </header>

      {enabled === false ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Monitor belum aktif. Deploy versi terbaru dengan volume <code>monitor</code> (lihat
          instruksi di thread), lalu serang lab <code>:8080</code> dari Kali.
        </p>
      ) : error && events.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-rose-600">Tidak bisa memuat monitor.</p>
      ) : events.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Belum ada aktivitas. Serang lab <code>:8080</code> dari Kali — tiap serangan muncul di
          sini secara langsung.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-white/80 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Waktu</th>
                <th className="px-3 py-2 font-medium">Kelas</th>
                <th className="px-3 py-2 font-medium">Sumber</th>
                <th className="px-3 py-2 font-medium">Request</th>
                <th className="px-3 py-2 font-medium">Signature</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => {
                const c = CATEGORY[e.category] ?? {
                  label: e.category,
                  cls: 'bg-slate-50 text-slate-600 ring-slate-200',
                };
                return (
                  <tr key={`${e.ts}-${i}`} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-5 py-2 text-slate-500">
                      {new Date(e.ts).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                          c.cls,
                        )}
                      >
                        {c.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">
                      {e.source}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      <span className="text-slate-400">{e.method}</span> {e.path}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{e.signature}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{e.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
