import app from "@/app";
import { connectDB, closeDB } from "@/config/db";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> => {
  for (let attempt = 1; attempt<= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) {
        logger.fatal(
          { event: `${label}_failed`, attempt, error: err },
          `${label} failed after ${maxAttempts} attempts`
        );
        throw err;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      logger.warn(
        { event: `${label}_retry`, attempt, nextRetryMs: delayMs, error:err },
        `${label} failed on attempt ${attempt}, retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label} failed after ${maxAttempts} attempts`);
};

export const startServer = async () => {

  const rawPort = env.PORT;
  const PORT = Number(rawPort);

  if(!Number.isFinite(PORT) || !Number.isInteger(PORT) || PORT<= 0 || PORT> 65535) throw new Error("Invalid PORT value");

  const NODE_ENV = env.NODE_ENV;

  await withRetry(() => connectDB(), "db_connected");
  logger.info({ event: "db_connected" }, "Database connected successfully");

  await withRetry(
    () =>
      new Promise<void>((resolve, reject) => {
        server = app.listen(PORT, () => {
          logger.info(
            { event: "server_started", port: PORT, environment: NODE_ENV },
            `Server is running in ${NODE_ENV} mode on port ${PORT}`
          );
          server!.removeListener("error", reject);
          resolve();
        });
        server.once("error", reject);
      }),
      "server_listen"
  );

  server!.on("error", (error: NodeJS.ErrnoException) => {
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
    const activeServer = server;

    activeServer.closeAllConnections?.();
    
    activeServer.close(async () => {
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
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(exitCode);
  }
};