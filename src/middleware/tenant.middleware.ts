import { Request, Response, NextFunction } from 'express';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ message: "Unauthorized" })
    }

    const tenantId = req.user.tenantId

    if(!tenantId) {
        return res.status(403).json({ message: "Tenant not found" })
    }

    req.tenantId = tenantId

    next()
}