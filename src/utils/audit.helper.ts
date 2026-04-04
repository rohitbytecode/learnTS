import { Request } from 'express';
import { logAuditEvent } from '@/services/audit.service';

interface AuditOptions {
  action: string;
  metadata?: Record<string, any>;
}

export const audit = (req: Request, { action, metadata }: AuditOptions) => {
  try {
    logAuditEvent({
      action,
      traceId: req.traceId,
      userId: (req as any).user?.id,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        ...metadata,
      },
    });
  } catch {
    // if audit fails, still req flow will continue
  }
};
