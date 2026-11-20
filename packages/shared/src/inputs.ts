import { z } from 'zod';
import { isValidCidr } from './cidr.js';
import { isValidCvssVector } from './cvss.js';

export const difficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const targetStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'RESETTING', 'MAINTENANCE']);
export const assessmentStatusSchema = z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']);
export const vulnStatusSchema = z.enum(['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'REMEDIATED']);
export const reportFormatSchema = z.enum(['MARKDOWN', 'JSON']);
const severity = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).optional().nullable();

// ── Labs ──
export const labCreateSchema = z.object({
  name: text(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, 'Use lowercase letters, numbers and dashes'),
  description: optText(2000),
  difficulty: difficultySchema,
  networkCidr: z.string().refine(isValidCidr, 'Must be an IPv4 CIDR like 172.30.10.0/24'),
  isActive: z.boolean().optional(),
});
export const labUpdateSchema = labCreateSchema.partial();

// ── Targets ──
const hostname = z
  .string()
  .trim()
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, 'Lowercase hostname on the lab network');
export const targetCreateSchema = z.object({
  laboratoryId: z.string().min(1),
  name: text(120),
  hostname,
  ipAddress: z.string().ip({ version: 'v4' }).optional().nullable(),
  baseUrl: z.string().url().max(300).optional().nullable(),
  appType: z.enum(['web', 'api', 'linux-host', 'windows-host', 'network-service']),
  technology: optText(200),
  difficulty: difficultySchema,
  status: targetStatusSchema.optional(),
  allowsIntrusive: z.boolean().optional(),
  dockerImage: text(200),
});
export const targetUpdateSchema = targetCreateSchema.omit({ laboratoryId: true }).partial();
export const targetQuerySchema = paginationSchema.extend({
  labId: z.string().optional(),
  status: targetStatusSchema.optional(),
  difficulty: difficultySchema.optional(),
  q: z.string().trim().max(100).optional(),
});

// ── Assessments ──
export const assessmentCreateSchema = z.object({
  title: text(200),
  targetId: z.string().min(1),
  description: optText(5000),
});
export const assessmentUpdateSchema = z.object({
  title: text(200).optional(),
  description: optText(5000),
  status: assessmentStatusSchema.optional(),
});
export const assessmentQuerySchema = paginationSchema.extend({
  status: assessmentStatusSchema.optional(),
  targetId: z.string().optional(),
});

// ── Findings ──
export const vulnerabilityCreateSchema = z.object({
  title: text(200),
  category: text(120),
  cwe: z
    .string()
    .trim()
    .regex(/^CWE-\d{1,5}$/, 'Format: CWE-79')
    .optional()
    .nullable(),
  /** If a CVSS vector is given, score and severity are calculated from it. */
  cvssVector: z
    .string()
    .trim()
    .refine(isValidCvssVector, 'Must be a CVSS v3.1 base vector')
    .optional()
    .nullable(),
  severity: severity.optional(),
  description: text(10000),
  evidence: optText(10000),
  remediation: optText(10000),
  status: vulnStatusSchema.optional(),
});
export const vulnerabilityUpdateSchema = vulnerabilityCreateSchema.partial();

// ── Reports ──
export const reportCreateSchema = z.object({
  format: reportFormatSchema.default('MARKDOWN'),
  title: text(200).optional(),
  summary: optText(5000),
});

// ── Users ──
export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._-]{3,32}$/),
  displayName: text(80),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'RESEARCHER', 'STUDENT']),
  password: z.string().min(12).max(256),
});
export const userUpdateSchema = z.object({
  displayName: text(80).optional(),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'RESEARCHER', 'STUDENT']).optional(),
  isActive: z.boolean().optional(),
});

// ── Audit ──
export const auditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(60).optional(),
  actorId: z.string().optional(),
});

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}
