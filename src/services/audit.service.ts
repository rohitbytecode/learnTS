import { insertAuditLog } from "@/repositories/audit.repository";
import { logger } from "@/utils/logger";

interface AuditLog {
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
  traceId?: string;
}

export const logAuditEvent = async (data: AuditLog) => {
  try {
    await insertAuditLog(data);
  } catch (error) {
    logger.error(
      {
        event: "audit_db_failed",
        error,
        fallback: data,
      },
      "Audit DB insert failed",
    );
  }
};
