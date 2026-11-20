import {
  LayoutDashboard,
  Crosshair,
  Radar,
  ShieldAlert,
  FlaskConical,
  KeyRound,
  EyeOff,
  FileText,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  phase?: string;
  blurb?: string;
}

/** Sidebar = spec §4 modules A–I. Items with `phase` are not built yet. */
export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/targets',
    label: 'Targets',
    icon: Crosshair,
    phase: 'Phase 2',
    blurb:
      'Lab targets with IP/domain, type, status and difficulty, plus a button to start an assessment.',
  },
  {
    href: '/reconnaissance',
    label: 'Reconnaissance',
    icon: Radar,
    phase: 'Phase 3',
    blurb:
      'Network discovery, port scanning, service and DNS enumeration, fingerprinting — run live from the Kali worker.',
  },
  {
    href: '/vulnerabilities',
    label: 'Vulnerability Assessment',
    icon: ShieldAlert,
    phase: 'Phase 3',
    blurb: 'SQLi, XSS, IDOR, CSRF, SSRF, auth flaws, misconfiguration and upload issues.',
  },
  {
    href: '/exploitation',
    label: 'Exploitation Lab',
    icon: FlaskConical,
    phase: 'Phase 4',
    blurb: 'Guided exercises against isolated, intentionally vulnerable targets.',
  },
  {
    href: '/persistence',
    label: 'Backdoor & Persistence',
    icon: KeyRound,
    phase: 'Phase 4',
    blurb: 'How backdoors and persistence work, and how to detect and remove them.',
  },
  {
    href: '/evasion',
    label: 'Evasion & Detection',
    icon: EyeOff,
    phase: 'Phase 4',
    blurb:
      'Defense-evasion and exfiltration patterns from the defender side; detection engineering.',
  },
  {
    href: '/reports',
    label: 'Reporting',
    icon: FileText,
    phase: 'Phase 2',
    blurb: 'Assessment history, findings with CVSS, evidence, remediation and PDF export.',
  },
  {
    href: '/learning',
    label: 'Learning Center',
    icon: GraduationCap,
    phase: 'Phase 4',
    blurb: 'Lessons, hands-on labs and quizzes from Beginner to Advanced.',
  },
];
