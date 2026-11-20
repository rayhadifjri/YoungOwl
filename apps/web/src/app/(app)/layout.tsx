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
      <Sidebar permissions={user.permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 px-4 pb-2 pt-6 sm:px-8">
          <div className="flex items-center gap-3 glass rounded-full py-1.5 pl-1.5 pr-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/80 shadow-sm text-[11px] font-semibold text-cyan-700">
              {initials}
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-[13px] text-slate-900">{user.displayName}</div>
              <div className="text-[11px] text-slate-400">{user.role.toLowerCase()}</div>
            </div>
            <LogoutButton />
          </div>
        </header>
        <MobileNav permissions={user.permissions} />
        <main className="flex-1 px-4 pb-10 pt-4 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
