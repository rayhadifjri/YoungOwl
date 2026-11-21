import { isLabMode } from '@/lib/lab';

export const dynamic = 'force-dynamic';

export function GET() {
  const lines = ['User-agent: *', 'Disallow: /api/'];
  // Lab mode: a classic recon breadcrumb.
  if (isLabMode()) lines.push('Disallow: /api/v1/system/debug');
  return new Response(`${lines.join('\n')}\n`, { headers: { 'content-type': 'text/plain' } });
}
