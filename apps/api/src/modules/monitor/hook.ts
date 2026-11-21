/**
 * Write side of the attack monitor. Registered only on the lab copy (VULN_MODE) when a monitor log
 * path is configured. It inspects every completed request, and if it matches an attack signature,
 * appends an event to the shared one-way log for the control center to display.
 */
import type { FastifyInstance } from 'fastify';
import { classify } from './classify.js';
import { appendEvent } from './store.js';

export function registerMonitorWriter(app: FastifyInstance, logPath: string): void {
  app.addHook('onResponse', async (req, reply) => {
    try {
      const path = (req.url || '').split('?')[0] || '/';
      const match = classify({
        method: req.method,
        path,
        query: req.query,
        body: req.body,
        userAgent: req.headers['user-agent'],
        statusCode: reply.statusCode,
      });
      if (!match) return;
      appendEvent(logPath, {
        ts: new Date().toISOString(),
        source: req.ip,
        method: req.method,
        path,
        category: match.category,
        severity: match.severity,
        signature: match.signature,
        status: reply.statusCode,
      });
    } catch {
      // Monitoring must never affect request handling.
    }
  });
}
