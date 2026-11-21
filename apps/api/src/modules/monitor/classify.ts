/**
 * Attack classifier for the live monitor. Pure and dependency-free so it is easy to unit-test.
 *
 * Given the shape of an incoming HTTP request (and its response status), it returns the single
 * strongest attack signature that matches, or `null` for ordinary traffic. The lab copy runs this
 * on every request and records the matches; the control center shows them. Signatures mirror the
 * ebook's "Deteksi & Monitoring" chapter.
 */

export const MONITOR_CATEGORIES = [
  'recon',
  'sqli',
  'xss',
  'idor',
  'traversal',
  'rce',
  'auth',
] as const;

export type MonitorCategory = (typeof MONITOR_CATEGORIES)[number];
export type MonitorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ClassifyInput {
  method: string;
  path: string;
  /** Query string object (values may be arrays). */
  query?: unknown;
  /** Parsed body, if any. */
  body?: unknown;
  userAgent?: string;
  statusCode?: number;
}

export interface Classification {
  category: MonitorCategory;
  severity: MonitorSeverity;
  signature: string;
}

/** Flattens query/body into one lowercase haystack of the attacker-controlled values. */
function haystack(input: ClassifyInput): string {
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === 'string') parts.push(v);
    else if (typeof v === 'number' || typeof v === 'boolean') parts.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(input.query);
  walk(input.body);
  // The path itself can carry traversal/encoded payloads.
  parts.push(decodeURISafe(input.path));
  return parts.join(' \u0000 ').toLowerCase();
}

function decodeURISafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const SCANNER_UA =
  /(nikto|sqlmap|nmap|whatweb|wafw00f|gobuster|ffuf|dirb|wpscan|nuclei|masscan|hydra)/i;

/**
 * Returns the strongest matching signature, or null. Order = severity: RCE first, recon last, so a
 * request that looks like several things is labelled by its most dangerous trait.
 */
export function classify(input: ClassifyInput): Classification | null {
  const hay = haystack(input);
  const ua = (input.userAgent ?? '').toLowerCase();
  const path = input.path.toLowerCase();

  // RCE — shell metacharacters in attacker input (critical).
  if (/[;|`]|\$\(|\$\{|&&|\bsleep\s|\|\s*id\b/.test(hay)) {
    return { category: 'rce', severity: 'critical', signature: 'Shell metacharacter in input' };
  }

  // SQL injection — quotes and SQL keywords.
  if (
    /'|%27|\bunion\s+select\b|\bselect\b.+\bfrom\b|\border\s+by\s+\d|--\s|\bsleep\s*\(/.test(hay)
  ) {
    return { category: 'sqli', severity: 'high', signature: 'SQL keyword / quote in input' };
  }

  // Path traversal — ../ and the ....// bypass.
  if (/\.\.\/|\.\.\\|\.\.\.\.\/\/|%2e%2e/.test(hay)) {
    return { category: 'traversal', severity: 'high', signature: 'Directory traversal sequence' };
  }

  // Stored/reflected XSS — HTML/JS injection.
  if (/<script|onerror\s*=|onload\s*=|<img\b|<svg\b|javascript:/.test(hay)) {
    return { category: 'xss', severity: 'medium', signature: 'HTML/JS injection attempt' };
  }

  // Broken access control / IDOR — direct object export.
  if (/\/assessments\/[^/]+\/export$/.test(path)) {
    return { category: 'idor', severity: 'medium', signature: 'Direct object access (export)' };
  }

  // Auth failures — a login that was rejected, or brute-force tooling.
  if (/\/auth\/login$/.test(path) && input.method.toUpperCase() === 'POST') {
    if (input.statusCode === 401 || /hydra/.test(ua)) {
      return { category: 'auth', severity: 'medium', signature: 'Failed / automated login' };
    }
  }

  // Recon — scanner user-agents, config/debug probes, and robots hints.
  if (SCANNER_UA.test(ua)) {
    return { category: 'recon', severity: 'low', signature: 'Scanner user-agent' };
  }
  if (path === '/robots.txt' || path.includes('/system/debug') || path.includes('/.env')) {
    return { category: 'recon', severity: 'low', signature: 'Config / debug probe' };
  }

  return null;
}
