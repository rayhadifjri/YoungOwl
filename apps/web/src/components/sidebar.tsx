'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { OwlLogo } from './logo';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-800 bg-navy-950/80 backdrop-blur lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <OwlLogo />
        <div>
          <div className="text-sm font-semibold tracking-[0.2em] text-white">YOUNG OWL</div>
          <div className="text-[10px] uppercase tracking-widest text-cyan-400/80">Security Lab</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Main">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-white ring-1 ring-cyan-400/30'
                  : 'text-slate-400 hover:bg-navy-850 hover:text-slate-100',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-300',
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.phase && <span className="text-[10px] text-slate-600">soon</span>}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-navy-800 bg-navy-900/60 p-3 text-[11px] leading-relaxed text-slate-500">
        Lab targets are isolated. Test only systems you own or have written permission to test.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-navy-800 px-3 py-2 lg:hidden"
      aria-label="Main mobile"
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'whitespace-nowrap rounded-md px-3 py-1.5 text-xs',
            pathname.startsWith(item.href) ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
