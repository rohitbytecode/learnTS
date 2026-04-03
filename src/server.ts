import app from "@/app";
import { connectDB, closeDB } from "@/config/db";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";
import {
  withRetry,
  isTransientError,
  createDbRetryClassifier,
  RetryAbortedError,
  RetryTimedOutError,
} from "@/utils/retry";

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;
const abortController = new AbortController();

export const startServer = async () => {
  const rawPort = env.PORT;
  const PORT = Number(rawPort);

  if (!Number.isFinite(PORT) || !Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
    throw new Error("Invalid PORT value");
  }

  const NODE_ENV = env.NODE_ENV;

  try {
    await withRetry(() => connectDB(), "db_connect", {
      maxAttempts: 4,
      baseDelayMs: 1200,
      jitterMs: 300,
      maxTotalMs: 25_000,
      shouldRetry: isTransientError,
      classifyRetryReason: createDbRetryClassifier(),
      signal: abortController.signal,

      onMetrics: (metrics) => {
        if (metrics.succeeded) {
          logger.info({
            event: "db_connect_success",
            attempt: metrics.attempt,
            totalElapsedMs: metrics.totalElapsedMs,
          });
        } else {
          logger.warn(
            {
              event: "db_connect_retry_failed",
              attempt: metrics.attempt,
              totalElapsedMs: metrics.totalElapsedMs,
              reason: metrics.reason,
              error: metrics.error,
            },
            `DB connection failed (reason: ${metrics.reason})`,
          );
        }
      },
    });
  } catch (err) {
    if (err instanceof RetryAbortedError) {
      logger.info({ event: "db_connect_aborted" }, "DB connection aborted during shutdown");
      return;
    }
    if (err instanceof RetryTimedOutError) {
      logger.fatal(
        { event: "db_connect_timeout", error: err.message },
        "DB connection exceeded total time allowed time during startup",
      );
      throw err;
    }

    logger.fatal(
      {
        event: "db_connect_fatal",
        error: err instanceof Error ? err.message : String(err),
      },
      "Failed to connect to database after retries",
    );
    throw err;
  }
  logger.info({ event: "db_connected" }, "Database connected successfully");

  await new Promise<void>((resolve, reject) => {
    server = app.listen(PORT, () => {
      logger.info(
        { event: "server_started", port: PORT, environment: NODE_ENV },
        `Server running in ${NODE_ENV} mode on port ${PORT}`,
      );
      server!.removeListener("error", reject);
      resolve();
    });
    server.once("error", reject);
  });

  server!.on("error", (error: NodeJS.ErrnoException) => {
    logger.fatal(
      { event: "server_error", error: error.message },
      "Server encountered a fatal error",
    );
    shutdownGracefully(1);
  });
};

export const shutdownGracefully = async (exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  abortController.abort();

  logger.info({ event: "shutdown_initiated" }, "Graceful shutdown initiated");

  if (server) {
    const activeServer = server;

    activeServer.closeAllConnections?.();

    activeServer.close(async () => {
      try {
        await closeDB();
        logger.info({ event: "shutdown_complete" }, "Graceful shutdown complete");
        process.exit(exitCode);
      } catch (err) {
        logger.error(
          { event: "shutdown_db_error", error: err instanceof Error ? err.message : String(err) },
          "Error while closing database during shutdown",
        );
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error({ event: "shutdown_timeout" }, "Shutdown timeout reached -> forcing exit");
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(exitCode);
  }
};
