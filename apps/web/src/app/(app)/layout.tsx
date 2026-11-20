import type { SessionUser } from '@young-owl/shared';
import { Sidebar, MobileNav } from '@/components/sidebar';
import { LogoutButton } from '@/components/logout-button';
import { apiGet } from '@/lib/api-server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await apiGet<{ user: SessionUser }>('/auth/me');
  const initials = user.displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-navy-800 bg-navy-950/60 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>lab-net: isolated</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-white">{user.displayName}</div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-400">{user.role}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-electric text-xs font-bold text-navy-950">
              {initials}
            </div>
            <LogoutButton />
          </div>
        </header>
        <MobileNav />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
