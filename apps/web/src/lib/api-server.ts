import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** Server-side fetch to the API, forwarding the user's session cookie. Redirects to /login on 401. */
export async function apiGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .filter((c) => c.name.startsWith('yo_'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const res = await fetch(`${API}/api/v1${path}`, { headers: { cookie }, cache: 'no-store' });
  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}
