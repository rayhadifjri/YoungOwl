import { hash, verify } from '@node-rs/argon2';
import { prisma } from '@young-owl/database';
import { randomToken, sha256 } from '../../lib/crypto.js';

// Hash of a random string: used so unknown-email logins take the same time as wrong-password ones.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hash(randomToken()));

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await verify(await getDummyHash(), password).catch(() => false);
    return null;
  }
  const ok = await verify(user.passwordHash, password).catch(() => false);
  return ok ? user : null;
}

export async function createSession(
  userId: string,
  ttlHours: number,
  meta: { ip?: string; userAgent?: string },
) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000);
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return { token, expiresAt };
}

export async function destroySession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function changePassword(
  userId: string,
  current: string,
  next: string,
  keepSessionId: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await verify(user.passwordHash, current).catch(() => false);
  if (!ok) return false;
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hash(next) } });
  // Log out every other session.
  await prisma.session.deleteMany({ where: { userId, NOT: { id: keepSessionId } } });
  return true;
}
