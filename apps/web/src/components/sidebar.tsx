'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { OwlLogo } from './logo';

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.permission || permissions.includes(i.permission));
  return (
    <aside className="sticky top-4 m-4 mr-0 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col glass lg:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        <OwlLogo className="h-7 w-7" />
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">Young Owl</span>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition',
                active
                  ? 'bg-white/80 shadow-sm text-slate-900'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-800',
              )}
            >
              <Icon
                className={cn('h-4 w-4', active ? 'text-cyan-600' : 'text-slate-400')}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.phase && (
                <span
                  className="h-1 w-1 rounded-full bg-slate-300"
                  title={`Arrives in ${item.phase}`}
                />
              )}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-5 text-[11px] leading-relaxed text-slate-400">
        Isolated lab. Test only what you own or may test.
      </p>
    </aside>
  );
}

export function MobileNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.permission || permissions.includes(i.permission));
  return (
    <nav className="mx-4 flex gap-1 overflow-x-auto glass p-1.5 lg:hidden" aria-label="Main mobile">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs',
            pathname.startsWith(item.href)
              ? 'bg-white/80 shadow-sm text-slate-900'
              : 'text-slate-500',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
