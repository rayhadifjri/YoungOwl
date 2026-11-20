import { prisma, type Prisma } from '@young-owl/database';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Append-only audit trail (threat model T13). Never throws into the request path. */
export async function audit(entry: AuditInput, log?: { error: (o: unknown, m: string) => void }) {
  try {
    await prisma.auditLog.create({ data: { ...entry, actorId: entry.actorId ?? null } });
  } catch (err) {
    log?.error({ err }, 'failed to write audit log');
  }
}
