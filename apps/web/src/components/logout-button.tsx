'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { apiPost } from '@/lib/api-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="px-2"
      aria-label="Sign out"
      onClick={async () => {
        await apiPost('/auth/logout');
        router.replace('/login');
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
