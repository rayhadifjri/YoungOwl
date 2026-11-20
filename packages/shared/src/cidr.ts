/** IPv4 helpers for lab scope checks (threat model T6/T7). */
export function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function isValidCidr(cidr: string): boolean {
  const [ip, bits] = cidr.split('/');
  if (!ip || bits === undefined || !/^\d{1,2}$/.test(bits)) return false;
  return ipv4ToInt(ip) !== null && Number(bits) <= 32;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  if (!isValidCidr(cidr)) return false;
  const [base, bitsStr] = cidr.split('/') as [string, string];
  const ipN = ipv4ToInt(ip);
  const baseN = ipv4ToInt(base);
  if (ipN === null || baseN === null) return false;
  const bits = Number(bitsStr);
  if (bits === 0) return true;
  const size = 2 ** (32 - bits);
  return Math.floor(ipN / size) === Math.floor(baseN / size);
}
