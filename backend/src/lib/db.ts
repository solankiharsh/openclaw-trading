import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Cap connection pool to avoid exhausting Supabase/Postgres (P2024 timeout)
const baseUrl = process.env.DATABASE_URL ?? '';
const hasParams = baseUrl.includes('?');
const poolParams = 'connection_limit=8&connect_timeout=15';
const datasourceUrl = baseUrl
  ? baseUrl + (hasParams ? '&' : '?') + poolParams
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Alias for `prisma` — use whichever name the consuming file prefers. */
export const db = prisma;

export async function checkDbConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
