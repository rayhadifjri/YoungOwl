import type { Severity } from './schemas.js';

export interface ReportData {
  title: string;
  summary?: string | null;
  generatedAt: string;
  author: string;
  assessment: {
    title: string;
    status: string;
    description?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  target: {
    name: string;
    hostname: string;
    ipAddress?: string | null;
    technology?: string | null;
    laboratory: string;
  };
  findings: {
    title: string;
    severity: Severity;
    cvssScore?: number | null;
    cvssVector?: string | null;
    category: string;
    cwe?: string | null;
    status: string;
    description: string;
    evidence?: string | null;
    remediation?: string | null;
  }[];
}

const ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export function sortFindings<T extends { severity: Severity; cvssScore?: number | null }>(
  f: T[],
): T[] {
  return [...f].sort(
    (a, b) =>
      ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) ||
      (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
  );
}

/** Plain-text cell: keep tables intact and avoid raw HTML in rendered Markdown. */
const md = (s: string) =>
  s.replace(/[|<>]/g, (c) => ({ '|': '\\|', '<': '&lt;', '>': '&gt;' })[c]!);
const block = (s: string) => '```text\n' + s.replace(/```/g, "'''") + '\n```';

export function renderReportMarkdown(d: ReportData): string {
  const findings = sortFindings(d.findings);
  const counts = ORDER.map(
    (s) =>
      `${s.charAt(0)}${s.slice(1).toLowerCase()}: ${findings.filter((f) => f.severity === s).length}`,
  );
  const lines = [
    `# ${md(d.title)}`,
    '',
    `Generated ${d.generatedAt} by ${md(d.author)} · Young Owl`,
    '',
    '## Scope',
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| Assessment | ${md(d.assessment.title)} (${d.assessment.status}) |`,
    `| Target | ${md(d.target.name)} — \`${d.target.hostname}\`${d.target.ipAddress ? ` (${d.target.ipAddress})` : ''} |`,
    `| Laboratory | ${md(d.target.laboratory)} |`,
    `| Technology | ${md(d.target.technology ?? '—')} |`,
    `| Period | ${d.assessment.startedAt ?? '—'} → ${d.assessment.completedAt ?? 'ongoing'} |`,
    '',
    '## Summary',
    '',
    d.summary ? md(d.summary) : `${findings.length} finding(s). ${counts.join(' · ')}.`,
    '',
    '## Findings overview',
    '',
    '| # | Finding | Severity | CVSS | Status |',
    '|---|---|---|---|---|',
    ...findings.map(
      (f, i) =>
        `| ${i + 1} | ${md(f.title)} | ${f.severity} | ${f.cvssScore ?? '—'} | ${f.status} |`,
    ),
    '',
    '## Details',
  ];
  findings.forEach((f, i) => {
    lines.push(
      '',
      `### ${i + 1}. ${md(f.title)}`,
      '',
      `- **Severity:** ${f.severity}${f.cvssScore != null ? ` (CVSS ${f.cvssScore})` : ''}`,
      ...(f.cvssVector ? [`- **Vector:** \`${f.cvssVector}\``] : []),
      `- **Category:** ${md(f.category)}${f.cwe ? ` · ${f.cwe}` : ''}`,
      `- **Status:** ${f.status}`,
      '',
      '**Description**',
      '',
      md(f.description),
      ...(f.evidence ? ['', '**Evidence**', '', block(f.evidence)] : []),
      ...(f.remediation ? ['', '**Remediation**', '', md(f.remediation)] : []),
    );
  });
  if (!findings.length) lines.push('', 'No findings recorded.');
  return lines.join('\n') + '\n';
}
