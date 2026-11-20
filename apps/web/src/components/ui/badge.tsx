import { cn } from '@/lib/utils';
import { titleCase } from '@/lib/format';

const SEVERITY: Record<string, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 ring-rose-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-sky-50 text-sky-700 ring-sky-200',
  INFO: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const STATUS: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  OFFLINE: 'bg-slate-300',
  RESETTING: 'bg-amber-400',
  MAINTENANCE: 'bg-orange-400',
  DRAFT: 'bg-slate-300',
  IN_PROGRESS: 'bg-cyan-500',
  COMPLETED: 'bg-emerald-500',
  ARCHIVED: 'bg-slate-400',
  OPEN: 'bg-rose-500',
  CONFIRMED: 'bg-orange-500',
  FALSE_POSITIVE: 'bg-slate-300',
  REMEDIATED: 'bg-emerald-500',
  QUEUED: 'bg-slate-300',
  RUNNING: 'bg-cyan-500',
  SUCCEEDED: 'bg-emerald-500',
  FAILED: 'bg-rose-500',
};

export function SeverityBadge({ severity, score }: { severity: string; score?: number | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        SEVERITY[severity],
      )}
    >
      {titleCase(severity)}
      {score != null && <span className="opacity-70">{score.toFixed(1)}</span>}
    </span>
  );
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-slate-600', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS[status] ?? 'bg-slate-300')} />
      {titleCase(status)}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200/80',
        className,
      )}
    >
      {children}
    </span>
  );
}
