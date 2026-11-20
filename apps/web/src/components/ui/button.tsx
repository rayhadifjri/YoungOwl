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
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50',
        variant === 'primary' &&
          'bg-gradient-to-r from-cyan-500 to-electric text-navy-950 hover:brightness-110',
        variant === 'ghost' && 'text-slate-300 hover:bg-navy-800 hover:text-white',
        className,
      )}
      {...props}
    />
  );
}
