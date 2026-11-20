import type { Severity } from './schemas.js';

const WEIGHTS: Record<Severity, number> = { CRITICAL: 15, HIGH: 8, MEDIUM: 3, LOW: 1, INFO: 0 };

/**
 * Security score 0–100 for the dashboard: 100 minus weighted open findings, floored at 0.
 * Simple and explainable; refined in Phase 5 (vulnerability analytics).
 */
export function securityScore(openBySeverity: Partial<Record<Severity, number>>): number {
  let penalty = 0;
  for (const [sev, count] of Object.entries(openBySeverity) as [Severity, number][]) {
    penalty += (WEIGHTS[sev] ?? 0) * (count ?? 0);
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}
