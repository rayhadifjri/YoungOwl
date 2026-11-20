import { prisma } from '@young-owl/database';
import type { SessionUser } from '@young-owl/shared';
import { NotFound, Forbidden } from '../../lib/errors.js';
import { seesAll } from '../../lib/http.js';

/**
 * Loads an assessment the user may see (owner, or a role with assessment:read_all).
 * Others get 404 rather than 403 so IDs of other users' work don't leak (threat model T10).
 */
export async function loadAssessment(user: SessionUser, id: string) {
  const a = await prisma.assessment.findUnique({ where: { id } });
  if (!a || (a.ownerId !== user.id && !seesAll(user))) throw NotFound('Assessment');
  return a;
}

/** Writes are limited to the owner and admins. Instructors can read everything but not edit. */
export async function loadAssessmentForWrite(user: SessionUser, id: string) {
  const a = await loadAssessment(user, id);
  if (a.ownerId !== user.id && user.role !== 'ADMIN')
    throw Forbidden('Only the owner or an admin can change this assessment.');
  return a;
}
