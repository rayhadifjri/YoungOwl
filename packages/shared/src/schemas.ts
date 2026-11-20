import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(256)
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/[0-9]/, 'Add a number'),
});

export const severitySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type Severity = z.infer<typeof severitySchema>;

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  permissions: string[];
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface DashboardSummary {
  totals: {
    laboratories: number;
    activeLaboratories: number;
    targets: number;
    targetsOnline: number;
    assessments: number;
    openVulnerabilities: number;
  };
  vulnerabilitiesBySeverity: Record<Severity, number>;
  assessmentsByMonth: { month: string; count: number }[];
  recentActivity: { id: string; action: string; actor: string | null; createdAt: string }[];
  learning: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
    quizzesPassed: number;
  };
  systemHealth: { database: 'ok' | 'down'; api: 'ok'; worker: 'not_configured' | 'ok' | 'down' };
  securityScore: number;
}
