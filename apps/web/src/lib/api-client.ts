'use client';

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
  /** Human-readable error message from the API error envelope, if any. */
  error?: string;
}

/** Browser-side call to the API (same origin via Next rewrite). Adds the CSRF header. */
export async function apiRequest<T = unknown>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const csrf = readCookie('yo_csrf');
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const text = await res.text();
  const data = (text ? JSON.parse(text) : null) as T & {
    error?: { message?: string; details?: { path: string[]; message: string }[] };
  };
  let error: string | undefined;
  if (!res.ok) {
    const d = data?.error?.details?.[0];
    error = d
      ? `${d.path.join('.')}: ${d.message}`
      : (data?.error?.message ?? `Request failed (${res.status})`);
  }
  return { ok: res.ok, status: res.status, data, error };
}

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>('POST', path, body);
export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  apiRequest<T>('PATCH', path, body);
export const apiDelete = <T = unknown>(path: string) => apiRequest<T>('DELETE', path);
