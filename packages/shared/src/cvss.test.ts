import { describe, expect, it } from 'vitest';
import { cvssBaseScore, isValidCvssVector, roundUp, severityFromScore } from './cvss.js';
import { ipInCidr, isValidCidr } from './cidr.js';

// Reference scores from the FIRST CVSS v3.1 calculator.
const cases: [string, number][] = [
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1],
  ['CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', 6.5],
  ['CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 8.8],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N', 5.3],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', 10],
  ['CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 7.8],
  ['CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N', 3.1],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N', 0],
];

describe('cvssBaseScore', () => {
  it.each(cases)('%s → %d', (v, s) => expect(cvssBaseScore(v)).toBe(s));
  it('rejects bad vectors', () => {
    expect(isValidCvssVector('CVSS:3.1/AV:X')).toBe(false);
    expect(() => cvssBaseScore('nope')).toThrow();
  });
  it('roundUp follows the spec', () => {
    expect(roundUp(4.02)).toBe(4.1);
    expect(roundUp(4.0)).toBe(4);
  });
  it('maps severity', () => {
    expect(severityFromScore(0)).toBe('INFO');
    expect(severityFromScore(3.9)).toBe('LOW');
    expect(severityFromScore(6.9)).toBe('MEDIUM');
    expect(severityFromScore(8.9)).toBe('HIGH');
    expect(severityFromScore(9.0)).toBe('CRITICAL');
  });
});

describe('cidr', () => {
  it('validates', () => {
    expect(isValidCidr('172.30.10.0/24')).toBe(true);
    expect(isValidCidr('300.1.1.1/24')).toBe(false);
    expect(isValidCidr('10.0.0.0/33')).toBe(false);
  });
  it('checks membership', () => {
    expect(ipInCidr('172.30.10.10', '172.30.10.0/24')).toBe(true);
    expect(ipInCidr('172.30.11.10', '172.30.10.0/24')).toBe(false);
    expect(ipInCidr('8.8.8.8', '172.30.0.0/16')).toBe(false);
  });
});
