import { describe, expect, it } from 'vitest';
import { securityScore } from './score.js';
import { ROLE_PERMISSIONS, PERMISSIONS } from './permissions.js';

describe('securityScore', () => {
  it('is 100 with no findings', () => expect(securityScore({})).toBe(100));
  it('weights by severity', () => expect(securityScore({ CRITICAL: 1, HIGH: 1, LOW: 2 })).toBe(75));
  it('never goes below 0', () => expect(securityScore({ CRITICAL: 50 })).toBe(0));
});

describe('ROLE_PERMISSIONS', () => {
  it('students cannot read audit logs or manage targets', () => {
    expect(ROLE_PERMISSIONS.STUDENT).not.toContain(PERMISSIONS.AUDIT_READ);
    expect(ROLE_PERMISSIONS.STUDENT).not.toContain(PERMISSIONS.TARGET_MANAGE);
  });
  it('admin has every permission', () => {
    expect(ROLE_PERMISSIONS.ADMIN.length).toBe(Object.keys(PERMISSIONS).length);
  });
});
