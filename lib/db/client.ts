import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '@/lib/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  __dbPool?: Pool;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

export const pool = globalForDb.__dbPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 20_000
  });

if (!globalForDb.__dbPool) {
  globalForDb.__dbPool = pool;
}

export const db =
  globalForDb.__drizzleDb ?? drizzle(pool, { schema, logger: env.NODE_ENV === 'development' });

if (!globalForDb.__drizzleDb) {
  globalForDb.__drizzleDb = db;
}

export type Database = typeof db;
export * from './schema';
