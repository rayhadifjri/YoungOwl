/**
 * Append-only JSONL store for monitor events, on a shared one-way volume.
 *
 * The lab copy appends events (write side); the control center reads them (read side, volume mounted
 * read-only). Everything is wrapped in try/catch and degrades to a no-op / empty list so a missing
 * or unwritable path never takes the API down.
 */
import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MonitorCategory } from './classify.js';

export interface MonitorEvent {
  ts: string;
  source: string;
  method: string;
  path: string;
  category: MonitorCategory;
  severity: string;
  signature: string;
  status: number;
}

/** Keep the file bounded: once it passes the cap, trim to the most recent KEEP lines. */
const CAP_BYTES = 512 * 1024;
const KEEP_LINES = 1500;

export function appendEvent(logPath: string, event: MonitorEvent): void {
  if (!logPath) return;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(event)}\n`);
    if (statSync(logPath).size > CAP_BYTES) trim(logPath);
  } catch {
    // Monitoring is best-effort; never let it break the request path.
  }
}

function trim(logPath: string): void {
  try {
    const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    if (lines.length > KEEP_LINES) {
      writeFileSync(logPath, `${lines.slice(-KEEP_LINES).join('\n')}\n`);
    }
  } catch {
    /* ignore */
  }
}

export interface ReadOptions {
  categories?: MonitorCategory[];
  limit?: number;
}

/** Returns the most recent events (newest first), optionally filtered by category. */
export function readEvents(logPath: string, opts: ReadOptions = {}): MonitorEvent[] {
  if (!logPath) return [];
  let raw: string;
  try {
    raw = readFileSync(logPath, 'utf8');
  } catch {
    return [];
  }
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const wanted = opts.categories && opts.categories.length ? new Set(opts.categories) : null;
  const out: MonitorEvent[] = [];
  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    const line = lines[i];
    if (!line) continue;
    try {
      const ev = JSON.parse(line) as MonitorEvent;
      if (wanted && !wanted.has(ev.category)) continue;
      out.push(ev);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
