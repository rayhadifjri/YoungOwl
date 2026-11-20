import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __youngOwlPrisma?: PrismaClient };

/** Shared Prisma client (one per process). */
export const prisma: PrismaClient =
  globalForPrisma.__youngOwlPrisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__youngOwlPrisma = prisma;
