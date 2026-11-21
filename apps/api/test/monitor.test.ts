import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { classify } from '../src/modules/monitor/classify.js';
import { appendEvent, readEvents, type MonitorEvent } from '../src/modules/monitor/store.js';

describe('attack classifier', () => {
  it('flags SQL injection in a query value', () => {
    const c = classify({
      method: 'GET',
      path: '/api/v1/targets/search',
      query: { q: "zzz' UNION SELECT 1" },
    });
    expect(c?.category).toBe('sqli');
  });

  it('flags command injection by shell metacharacters (over SQLi)', () => {
    const c = classify({
      method: 'POST',
      path: '/api/v1/tools/lookup',
      body: { host: 'localhost; id' },
    });
    expect(c?.category).toBe('rce');
    expect(c?.severity).toBe('critical');
  });

  it('flags the ....// path-traversal bypass', () => {
    const c = classify({
      method: 'GET',
      path: '/api/v1/files',
      query: { name: '....//secret/flag.txt' },
    });
    expect(c?.category).toBe('traversal');
  });

  it('flags stored XSS payloads', () => {
    const c = classify({
      method: 'POST',
      path: '/api/v1/findings',
      body: { description: '<img src=x onerror=alert(1)>' },
    });
    expect(c?.category).toBe('xss');
  });

  it('flags IDOR on the export endpoint', () => {
    const c = classify({ method: 'GET', path: '/api/v1/assessments/abc123/export' });
    expect(c?.category).toBe('idor');
  });

  it('flags failed logins but not successful ones', () => {
    expect(
      classify({ method: 'POST', path: '/api/v1/auth/login', statusCode: 401 })?.category,
    ).toBe('auth');
    expect(classify({ method: 'POST', path: '/api/v1/auth/login', statusCode: 200 })).toBeNull();
  });

  it('flags scanner user-agents and debug probes as recon', () => {
    expect(
      classify({ method: 'GET', path: '/', userAgent: 'Mozilla/5.0 sqlmap/1.7' })?.category,
    ).toBe('recon');
    expect(classify({ method: 'GET', path: '/api/v1/system/debug' })?.category).toBe('recon');
  });

  it('ignores ordinary traffic', () => {
    expect(
      classify({ method: 'GET', path: '/api/v1/dashboard/summary', statusCode: 200 }),
    ).toBeNull();
    expect(
      classify({ method: 'GET', path: '/api/v1/targets', query: { page: '1' }, statusCode: 200 }),
    ).toBeNull();
  });
});

describe('monitor store', () => {
  const dir = mkdtempSync(join(tmpdir(), 'yo-monitor-'));
  const log = join(dir, 'events.jsonl');
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const ev = (category: MonitorEvent['category']): MonitorEvent => ({
    ts: new Date().toISOString(),
    source: '10.0.0.9',
    method: 'GET',
    path: '/x',
    category,
    severity: 'high',
    signature: 'test',
    status: 500,
  });

  it('round-trips events newest-first and filters by category', () => {
    appendEvent(log, ev('sqli'));
    appendEvent(log, ev('rce'));
    appendEvent(log, ev('sqli'));
    const all = readEvents(log);
    expect(all).toHaveLength(3);
    expect(all[0]!.category).toBe('sqli'); // newest first
    const onlyRce = readEvents(log, { categories: ['rce'] });
    expect(onlyRce).toHaveLength(1);
  });

  it('returns [] for a missing or empty path without throwing', () => {
    expect(readEvents('')).toEqual([]);
    expect(readEvents(join(dir, 'nope.jsonl'))).toEqual([]);
  });
});
