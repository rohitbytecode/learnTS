import http from "http";
import app from "./app";
import { connectDB, closeDB } from "./config/db";
import { logger } from "./utils/logger";

let server: http.Server | undefined;
let isShuttingDown = false;

export const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  const NODE_ENV = process.env.NODE_ENV || "development";

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in environment variables");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  await connectDB();
  logger.info({ event: "database_connected" }, "Database connected successfully");

  server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(
      {
        event: "server_started",
        port: PORT,
        environment: NODE_ENV,
      },
      `Server is running in ${NODE_ENV} mode on port ${PORT}`
    );
  });
};

export const shutdownGracefully = async (exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ event: "shutdown_initiated" }, "Graceful shutdown initiated");

  if (server) {
    server.close(async () => {
      await closeDB();
      logger.info({ event: "shutdown_complete" }, "Shutdown complete");
      process.exit(exitCode);
    });

    setTimeout(() => {
      logger.error({ event: "shutdown_timeout" }, "Forced shutdown");
      process.exit(exitCode);
    }, 10000).unref();
  } else {
    process.exit(exitCode);
  }
};