/** Permission keys checked by the API RBAC layer. See docs/architecture.md §6. */
export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ROLE_READ: 'role:read',
  LAB_READ: 'lab:read',
  LAB_USE: 'lab:use',
  LAB_MANAGE: 'lab:manage',
  TARGET_READ: 'target:read',
  TARGET_MANAGE: 'target:manage',
  ASSESSMENT_READ: 'assessment:read',
  ASSESSMENT_READ_ALL: 'assessment:read_all',
  ASSESSMENT_CREATE: 'assessment:create',
  ASSESSMENT_UPDATE: 'assessment:update',
  JOB_CREATE: 'job:create',
  FINDING_WRITE: 'finding:write',
  REPORT_READ: 'report:read',
  REPORT_CREATE: 'report:create',
  LEARN_READ: 'learn:read',
  LEARN_MANAGE: 'learn:manage',
  AUDIT_READ: 'audit:read',
  SYSTEM_READ: 'system:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = ['ADMIN', 'INSTRUCTOR', 'RESEARCHER', 'STUDENT'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

const P = PERMISSIONS;
const ALL = Object.values(P) as Permission[];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  ADMIN: ALL,
  INSTRUCTOR: [
    P.USER_READ,
    P.ROLE_READ,
    P.LAB_READ,
    P.LAB_USE,
    P.LAB_MANAGE,
    P.TARGET_READ,
    P.TARGET_MANAGE,
    P.ASSESSMENT_READ,
    P.ASSESSMENT_READ_ALL,
    P.REPORT_READ,
    P.LEARN_READ,
    P.LEARN_MANAGE,
    P.SYSTEM_READ,
  ],
  RESEARCHER: [
    P.LAB_READ,
    P.LAB_USE,
    P.TARGET_READ,
    P.ASSESSMENT_READ,
    P.ASSESSMENT_CREATE,
    P.ASSESSMENT_UPDATE,
    P.JOB_CREATE,
    P.FINDING_WRITE,
    P.REPORT_READ,
    P.REPORT_CREATE,
    P.LEARN_READ,
  ],
  STUDENT: [P.LAB_READ, P.LAB_USE, P.TARGET_READ, P.ASSESSMENT_READ, P.JOB_CREATE, P.LEARN_READ],
};
