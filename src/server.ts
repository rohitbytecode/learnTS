import app from "@/app";
import { connectDB, closeDB } from "@/config/db";
import { logger } from "@/utils/logger";
import { z } from 'zod';

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const startServer = async () => {

  const rawPort = env.PORT || '5000';
  const PORT = Number(rawPort);

  if(!Number.isInteger(PORT) || PORT<= 0 || PORT> 65535) throw new Error("Invalid PORT value");

  const NODE_ENV = env.NODE_ENV || "development";

  await connectDB();
  logger.info({ event: "database_connected" }, "Database connected successfully");

  server = app.listen(PORT, () => {
    logger.info(
      {
        event: "server_started",
        port: PORT,
        environment: NODE_ENV,
      },
      `Server is running in ${NODE_ENV} mode on port ${PORT}`
    );
  });

  server.on("error", (error) => {
    logger.fatal(
      { event: "server_error", error: error },
      "Server encountered an error"
    );
    shutdownGracefully(1);
  });
};

export const shutdownGracefully = async (exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ event: "shutdown_initiated" }, "Graceful shutdown initiated");

  if (server) {
    server.close(async () => {
      try {
        await closeDB();
        logger.info({ event: "shutdown_complete" }, "Shutdown complete");
        process.exit(exitCode);
      } catch (err) {
        logger.error({ event: "shutdown_db_error", error: err });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error({ event: "shutdown_timeout" }, "Forced shutdown");
      process.exit(exitCode);
    }, 10000).unref();
  } else {
    process.exit(exitCode);
  }
};