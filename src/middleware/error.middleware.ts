import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { errorResponse } from "@/utils/apiResponse";
import { env } from "@/config/env";

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
      stack: env.NODE_ENV === "development" ? err.stack : undefined,
    },
    "Error Handled"
  );

  const message =
      env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;

  res.status(statusCode).json(
    errorResponse(message, env.NODE_ENV !== "production" ? err : undefined)
  );
};