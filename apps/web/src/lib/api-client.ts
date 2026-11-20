'use client';

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/** Browser-side call to the API (same origin via Next rewrite). Adds the CSRF header. */
export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T }> {
  const csrf = readCookie('yo_csrf');
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: (text ? JSON.parse(text) : null) as T };
}
