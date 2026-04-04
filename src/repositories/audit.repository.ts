import { randomUUID } from 'node:crypto';
import { pool } from '@/config/db';

interface AuditLog {
  action: string;
  userId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

export const insertAuditLog = async ({ action, userId, traceId, metadata }: AuditLog) => {
  const query = `INSERT INTO audit_logs (id, action, user_id, trace_id, metadata)
    VALUES ($1, $2, $3, $4, $5)`;

  await pool.query(query, [randomUUID(), action, userId || null, traceId || null, metadata || {}]);
};
