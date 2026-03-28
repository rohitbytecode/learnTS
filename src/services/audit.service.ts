import { logger } from "@/utils/logger";

interface AuditLog {
    action: string;
    userId?: string;
    metadata?: Record<string, any>;
    traceId?: string;
}

export const logAuditEvent = ({
    action,
    userId,
    metadata,
    traceId,
}: AuditLog) => {
    logger.info({
        event: "audit_log",
        action,
        userId,
        metadata,
        traceId,
    });
};