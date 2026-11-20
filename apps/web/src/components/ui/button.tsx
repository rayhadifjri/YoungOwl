import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:opacity-50',
        variant === 'primary' && 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
        variant === 'ghost' && 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
        className,
      )}
      {...props}
    />
  );
}
