import { JwtPayload } from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      user?: string | (JwtPayload & { tenantId?: string; role?: string })
      tenantId?: string
      role?: string
    }
  }
}