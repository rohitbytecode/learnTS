import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: string;
      };
      tenantId?: string;
      traceId?: string;
    }
  }
}

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
}
