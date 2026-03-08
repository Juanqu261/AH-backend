import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
// We configure a pool which the neon serverless driver handles well.
// If DATABASE_URL is not set, we don't crash immediately but wait until queries are made.
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Use a singleton instance to prevent connection limits in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
