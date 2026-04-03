import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const traceId = randomUUID();

  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  next();
};
