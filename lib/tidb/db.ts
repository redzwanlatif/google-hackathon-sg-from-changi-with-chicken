// TiDB Database Connection (Server-side only)
// Uses mysql2 for TiDB Cloud (MySQL compatible)

import mysql from 'mysql2/promise';

// Connection pool for TiDB
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: parseInt(process.env.TIDB_PORT || '4000'),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE || 'chicken_game',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

// Helper to run queries
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

// Helper to run single insert/update
export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    await pool.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('TiDB connection failed:', error);
    return false;
  }
}
