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
  ClipboardList,
  ScrollText,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hide unless the user has this permission. */
  permission?: string;
  /** Only shown in lab mode (VULN_MODE). */
  labOnly?: boolean;
}

/** Sidebar = spec §4 modules A–I. */
export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/targets', label: 'Targets', icon: Crosshair },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/reconnaissance', label: 'Reconnaissance', icon: Radar },
  { href: '/vulnerabilities', label: 'Vulnerability Assessment', icon: ShieldAlert },
  { href: '/exploitation', label: 'Exploitation Lab', icon: FlaskConical },
  { href: '/persistence', label: 'Backdoor & Persistence', icon: KeyRound },
  { href: '/evasion', label: 'Evasion & Detection', icon: EyeOff },
  { href: '/reports', label: 'Reporting', icon: FileText, permission: 'report:read' },
  {
    href: '/learning',
    label: 'Learning Center',
    icon: GraduationCap,
    permission: 'learn:read',
  },
  { href: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit:read' },
  { href: '/tools', label: 'Lab tools', icon: Wrench, labOnly: true },
];
