import 'server-only';
import { cache } from 'react';
import type { SessionUser } from '@young-owl/shared';
import { apiGet } from './api-server';

/** Current user, fetched once per request. */
export const getMe = cache(async () => (await apiGet<{ user: SessionUser }>('/auth/me')).user);
export const can = (u: SessionUser, perm: string) => u.permissions.includes(perm);
