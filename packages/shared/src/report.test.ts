import { describe, expect, it } from 'vitest';
import { renderReportMarkdown } from './report.js';

describe('renderReportMarkdown', () => {
  const base = {
    title: 'Test report',
    generatedAt: '2026-01-01T00:00:00Z',
    author: 'Tester',
    assessment: { title: 'A', status: 'COMPLETED' },
    target: { name: 'Juice', hostname: 'juice-shop', laboratory: 'Web' },
  };
  it('sorts findings by severity and escapes HTML', () => {
    const out = renderReportMarkdown({
      ...base,
      findings: [
        { title: 'Low one', severity: 'LOW', category: 'x', status: 'OPEN', description: 'd' },
        {
          title: '<script>x</script>',
          severity: 'CRITICAL',
          cvssScore: 9.8,
          category: 'x',
          status: 'OPEN',
          description: 'd',
          evidence: 'payload ``` here',
        },
      ],
    });
    expect(out.indexOf('&lt;script&gt;')).toBeLessThan(out.indexOf('Low one'));
    expect(out).not.toContain('<script>');
    expect(out).toContain('Critical: 1');
  });
  it('handles no findings', () => {
    expect(renderReportMarkdown({ ...base, findings: [] })).toContain('No findings recorded.');
  });
});
