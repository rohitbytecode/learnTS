import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  logger.error(
    {
      event: "error_occurred",
      path: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    "Error Handled"
  );

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
};