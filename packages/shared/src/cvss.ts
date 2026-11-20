import type { Severity } from './schemas.js';

/**
 * CVSS v3.1 base score calculator (FIRST.org specification, section 7).
 * Accepts vectors like "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H".
 */
const W = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PR_U: { N: 0.85, L: 0.62, H: 0.27 },
  PR_C: { N: 0.85, L: 0.68, H: 0.5 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;

const VECTOR_RE =
  /^CVSS:3\.[01]\/AV:([NALP])\/AC:([LH])\/PR:([NLH])\/UI:([NR])\/S:([UC])\/C:([HLN])\/I:([HLN])\/A:([HLN])$/;

/** CVSS "Roundup": smallest number, to 1 decimal, >= input (spec appendix A). */
export function roundUp(value: number): number {
  const i = Math.round(value * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

export function isValidCvssVector(vector: string): boolean {
  return VECTOR_RE.test(vector);
}

export function cvssBaseScore(vector: string): number {
  const m = VECTOR_RE.exec(vector);
  if (!m) throw new Error('Invalid CVSS v3.x vector');
  const [, av, ac, pr, ui, s, c, i, a] = m as unknown as [
    string,
    keyof typeof W.AV,
    keyof typeof W.AC,
    'N' | 'L' | 'H',
    keyof typeof W.UI,
    'U' | 'C',
    keyof typeof W.CIA,
    keyof typeof W.CIA,
    keyof typeof W.CIA,
  ];
  const changed = s === 'C';
  const iss = 1 - (1 - W.CIA[c]) * (1 - W.CIA[i]) * (1 - W.CIA[a]);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const exploitability =
    8.22 * W.AV[av] * W.AC[ac] * (changed ? W.PR_C[pr] : W.PR_U[pr]) * W.UI[ui];
  if (impact <= 0) return 0;
  return changed
    ? roundUp(Math.min(1.08 * (impact + exploitability), 10))
    : roundUp(Math.min(impact + exploitability, 10));
}

/** Qualitative severity rating scale (CVSS v3.1 spec, table 14). */
export function severityFromScore(score: number): Severity {
  if (score === 0) return 'INFO';
  if (score < 4) return 'LOW';
  if (score < 7) return 'MEDIUM';
  if (score < 9) return 'HIGH';
  return 'CRITICAL';
}
