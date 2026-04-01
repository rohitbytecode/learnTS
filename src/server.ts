import app from "@/app";
import { connectDB, closeDB } from "@/config/db";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

export const startServer = async () => {

  const rawPort = env.PORT;
  const PORT = Number(rawPort);

  if(!Number.isFinite(PORT) || !Number.isInteger(PORT) || PORT<= 0 || PORT> 65535) throw new Error("Invalid PORT value");

  const NODE_ENV = env.NODE_ENV;

  await connectDB();
  logger.info({ event: "database_connected" }, "Database connected successfully");

  await new Promise<void>((resolve, reject)=> {
  server = app.listen(PORT, () => {
    logger.info(
      {
        event: "server_started",
        port: PORT,
        environment: NODE_ENV,
      },
      `Server is running in ${NODE_ENV} mode on port ${PORT}`
    );
    server!.removeListener("error", reject);
    resolve();
  });
    server.once("error", reject);
});

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