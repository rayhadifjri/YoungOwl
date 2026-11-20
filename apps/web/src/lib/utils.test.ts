import { describe, expect, it } from 'vitest';
import { humanizeAction, timeAgo } from './utils';

describe('utils', () => {
  it('timeAgo', () => {
    const now = Date.parse('2026-01-02T00:00:00Z');
    expect(timeAgo('2026-01-01T23:59:30Z', now)).toBe('30s ago');
    expect(timeAgo('2026-01-01T22:00:00Z', now)).toBe('2h ago');
    expect(timeAgo('2025-12-30T00:00:00Z', now)).toBe('3d ago');
  });
  it('humanizeAction', () => expect(humanizeAction('auth.login.failed')).toBe('Auth login failed'));
});
