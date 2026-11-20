'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError, Input, Label, Select } from '@/components/ui/form';
import { apiPatch, apiPost } from '@/lib/api-client';
import type { Lab } from './page';

export function TargetStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  return (
    <Select
      aria-label="Target status"
      value={value}
      disabled={busy}
      className="py-1.5 text-xs"
      onChange={async (e) => {
        const next = e.target.value;
        setBusy(true);
        const r = await apiPatch(`/targets/${id}`, { status: next });
        setBusy(false);
        if (r.ok) {
          setValue(next);
          router.refresh();
        }
      }}
    >
      {['ONLINE', 'OFFLINE', 'RESETTING', 'MAINTENANCE'].map((s) => (
        <option key={s} value={s}>
          {s.charAt(0) + s.slice(1).toLowerCase()}
        </option>
      ))}
    </Select>
  );
}

export function StartAssessmentButton({
  targetId,
  targetName,
  disabled,
}: {
  targetId: string;
  targetName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!open) {
    return (
      <Button
        variant="ghost"
        className="ml-auto px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Play className="h-3.5 w-3.5" /> Start assessment
      </Button>
    );
  }
  return (
    <form
      className="ml-auto flex w-full items-center gap-2 sm:w-auto"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const title = String(new FormData(e.currentTarget).get('title'));
        const r = await apiPost<{ id: string }>('/assessments', { title, targetId });
        setBusy(false);
        if (!r.ok) return setError(r.error);
        router.push(`/assessments/${r.data.id}`);
      }}
    >
      <Input
        name="title"
        required
        autoFocus
        defaultValue={`${targetName} assessment`}
        className="py-1.5 text-xs sm:w-56"
        aria-label="Assessment title"
      />
      <Button type="submit" className="px-3 py-1.5 text-xs" disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Start'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-1.5"
        onClick={() => setOpen(false)}
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  );
}

export function AddTargetButton({ labs }: { labs: Lab[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [labId, setLabId] = useState(labs[0]?.id ?? '');
  const lab = labs.find((l) => l.id === labId);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add target
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/10 p-4 pt-16 backdrop-blur-sm">
      <form
        className="glass-strong w-full max-w-lg space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(undefined);
          const f = new FormData(e.currentTarget);
          const opt = (k: string) => String(f.get(k) ?? '').trim() || null;
          const r = await apiPost('/targets', {
            laboratoryId: labId,
            name: f.get('name'),
            hostname: f.get('hostname'),
            ipAddress: opt('ipAddress'),
            baseUrl: opt('baseUrl'),
            appType: f.get('appType'),
            technology: opt('technology'),
            difficulty: f.get('difficulty'),
            dockerImage: f.get('dockerImage'),
            allowsIntrusive: f.get('allowsIntrusive') === 'on',
          });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setOpen(false);
          router.refresh();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Add target</h2>
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
        <div>
          <Label htmlFor="lab">Laboratory</Label>
          <Select id="lab" value={labId} onChange={(e) => setLabId(e.target.value)}>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.networkCidr})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="hostname">Hostname</Label>
            <Input id="hostname" name="hostname" required placeholder="my-target" />
          </div>
          <div>
            <Label htmlFor="ipAddress">IP address</Label>
            <Input
              id="ipAddress"
              name="ipAddress"
              placeholder={lab?.networkCidr.replace(/0\/\d+$/, '20')}
            />
          </div>
          <div>
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input id="baseUrl" name="baseUrl" placeholder="http://my-target:8080" />
          </div>
          <div>
            <Label htmlFor="appType">Type</Label>
            <Select id="appType" name="appType" defaultValue="web">
              {['web', 'api', 'linux-host', 'windows-host', 'network-service'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select id="difficulty" name="difficulty" defaultValue="BEGINNER">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="technology">Technology</Label>
            <Input id="technology" name="technology" placeholder="PHP / MySQL" />
          </div>
          <div>
            <Label htmlFor="dockerImage">Docker image</Label>
            <Input id="dockerImage" name="dockerImage" required placeholder="vendor/image:tag" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="allowsIntrusive" className="accent-cyan-600" /> Allow
          intrusive tools (SQLMap, Hydra) on this target
        </label>
        <p className="text-xs text-slate-400">
          The IP must be inside the lab network and the base URL must point at this target.
        </p>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save target
          </Button>
        </div>
      </form>
    </div>
  );
}
