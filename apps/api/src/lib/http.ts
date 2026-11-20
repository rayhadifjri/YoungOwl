import { PERMISSIONS, type SessionUser } from '@young-owl/shared';

export function pageArgs(q: { page: number; pageSize: number }) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

export function paginated<T>(data: T[], total: number, q: { page: number; pageSize: number }) {
  return { data, meta: { page: q.page, pageSize: q.pageSize, total } };
}

export const has = (user: SessionUser, perm: string) => user.permissions.includes(perm);
export const seesAll = (user: SessionUser) => has(user, PERMISSIONS.ASSESSMENT_READ_ALL);
