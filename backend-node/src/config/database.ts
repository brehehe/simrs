import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool with Read-Only User 'simrs_dashboard_ro'
 * Node.js is strictly constrained to SELECT queries.
 */
export const dbPool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'simrs_db',
  user: process.env.DB_RO_USER || 'simrs_dashboard_ro',
  password: process.env.DB_RO_PASSWORD || 'SimrsDashboardSecret2026!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function queryReadOnly<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const client = await dbPool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}
