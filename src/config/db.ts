import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

const connectionString = env.DATABASE_URL;

export const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function connectDB() {
  const MAX_RETRIES = 5;
  const DELAY = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;

      console.log('PostgreSQL connected successfully');
      return;
    } catch (error) {
      console.log(`DB connection failed (attempt ${attempt})`);

      if (attempt === MAX_RETRIES) {
        console.error('All retries failed. Exiting...');
        process.exit(1);
      }

      await new Promise((res) => setTimeout(res, DELAY));
    }
  }
}

export async function closeDB() {
  await prisma.$disconnect();
  await pool.end();
}
