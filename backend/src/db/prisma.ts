import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };


const connectionString = 
  process.env.DATABASE_PUBLIC_URL || 
  process.env.DATABASE_URL;         

if (!connectionString) {
  throw new Error(
    'DATABASE_URL or DATABASE_PUBLIC_URL environment variable is required. ' +
    'Use DATABASE_PUBLIC_URL for local development, DATABASE_URL for Railway production.'
  );
}


const pool = new Pool({ 
  connectionString,
});

pool.on('connect', async (client) => {
  await client.query('SET timezone = UTC');
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

