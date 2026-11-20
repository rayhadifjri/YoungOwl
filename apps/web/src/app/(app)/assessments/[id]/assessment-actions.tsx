'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, Loader2, Plus, X } from 'lucide-react';
import { cvssBaseScore, isValidCvssVector, severityFromScore } from '@young-owl/shared';
import { Button } from '@/components/ui/button';
import { FormError, Input, Label, Select, Textarea } from '@/components/ui/form';
import { SeverityBadge } from '@/components/ui/badge';
import { apiPatch, apiPost } from '@/lib/api-client';

function useStatusSelect(path: string, initial: string) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setBusy(true);
    const r = await apiPatch(path, { status: next });
    setBusy(false);
    if (r.ok) {
      setValue(next);
      router.refresh();
    }
  };
  return { value, busy, onChange };
}

const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

export function AssessmentStatusSelect({ id, status }: { id: string; status: string }) {
  const s = useStatusSelect(`/assessments/${id}`, status);
  return (
    <Select
      aria-label="Assessment status"
      value={s.value}
      disabled={s.busy}
      onChange={s.onChange}
      className="w-40"
    >
      {['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].map((v) => (
        <option key={v} value={v}>
          {label(v)}
        </option>
      ))}
    </Select>
  );
}

export function FindingStatusSelect({ id, status }: { id: string; status: string }) {
  const s = useStatusSelect(`/vulnerabilities/${id}`, status);
  return (
    <Select
      aria-label="Finding status"
      value={s.value}
      disabled={s.busy}
      onChange={s.onChange}
      onClick={(e) => e.stopPropagation()}
      className="w-36 py-1 text-xs"
    >
      {['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'REMEDIATED'].map((v) => (
        <option key={v} value={v}>
          {label(v)}
        </option>
      ))}
    </Select>
  );
}

export function GenerateReport({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const make = async (format: 'MARKDOWN' | 'JSON') => {
    setBusy(format);
    const r = await apiPost(`/assessments/${assessmentId}/reports`, { format });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    router.refresh();
  };
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      {(['MARKDOWN', 'JSON'] as const).map((f) => (
        <Button
          key={f}
          variant="ghost"
          className="px-3 py-1.5 text-xs"
          disabled={!!busy}
          onClick={() => make(f)}
        >
          {busy === f ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          {f === 'MARKDOWN' ? 'Markdown report' : 'JSON report'}
        </Button>
      ))}
    </div>
  );
}

export function AddFindingButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [vector, setVector] = useState('');

  const computed = useMemo(() => {
    const v = vector.trim();
    if (!v) return null;
    if (!isValidCvssVector(v)) return 'invalid' as const;
    const score = cvssBaseScore(v);
    return { score, severity: severityFromScore(score) };
  }, [vector]);

  if (!open) {
    return (
      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add finding
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/10 p-4 pt-12 backdrop-blur-sm">
      <form
        className="glass-strong w-full max-w-2xl space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(undefined);
          const f = new FormData(e.currentTarget);
          const opt = (k: string) => String(f.get(k) ?? '').trim() || null;
          const r = await apiPost(`/assessments/${assessmentId}/vulnerabilities`, {
            title: f.get('title'),
            category: f.get('category'),
            cwe: opt('cwe'),
            cvssVector: opt('cvssVector'),
            severity: computed && computed !== 'invalid' ? undefined : f.get('severity'),
            description: f.get('description'),
            evidence: opt('evidence'),
            remediation: opt('remediation'),
          });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setOpen(false);
          setVector('');
          router.refresh();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Add finding</h2>
          <Button
            type="button"
            variant="ghost"
            className="px-2"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="SQL injection in login form" />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue="A03:2021 Injection">
              {[
                'A01:2021 Broken Access Control',
                'A02:2021 Cryptographic Failures',
                'A03:2021 Injection',
                'A04:2021 Insecure Design',
                'A05:2021 Security Misconfiguration',
                'A06:2021 Vulnerable and Outdated Components',
                'A07:2021 Identification and Authentication Failures',
                'A08:2021 Software and Data Integrity Failures',
                'A09:2021 Security Logging and Monitoring Failures',
                'A10:2021 Server-Side Request Forgery',
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cwe">CWE</Label>
            <Input id="cwe" name="cwe" placeholder="CWE-89" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cvssVector">CVSS 3.1 vector (optional, sets score and severity)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="cvssVector"
                name="cvssVector"
                value={vector}
                onChange={(e) => setVector(e.target.value)}
                placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
                className="font-mono text-xs"
              />
              {computed === 'invalid' && (
                <span className="whitespace-nowrap text-xs text-rose-600">Invalid vector</span>
              )}
              {computed && computed !== 'invalid' && (
                <SeverityBadge severity={computed.severity} score={computed.score} />
              )}
            </div>
          </div>
          {(!computed || computed === 'invalid') && (
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select id="severity" name="severity" defaultValue="MEDIUM">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="evidence">Evidence</Label>
            <Textarea
              id="evidence"
              name="evidence"
              className="font-mono text-xs"
              placeholder="Request/response, payload, tool output…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="remediation">Remediation</Label>
            <Textarea id="remediation" name="remediation" />
          </div>
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || computed === 'invalid'}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save finding
          </Button>
        </div>
      </form>
    </div>
  );
}
