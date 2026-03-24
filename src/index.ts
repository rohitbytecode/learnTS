import { startServer, shutdownGracefully } from "./server";
import { logger } from "./utils/logger";

const bootstrap = async () => {
  try {
    await startServer();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.fatal(
        {
          event: "startup_failed",
          error: error.message,
        },
        "Application failed to start"
      );
    }
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  logger.fatal({ event: "unhandled_rejection", error: err });
  shutdownGracefully(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ event: "uncaught_exception", error: err });
  shutdownGracefully(1);
});

process.on("SIGTERM", () => {
  logger.info({ event: "SIGTERM" });
  shutdownGracefully();
});

process.on("SIGINT", () => {
  logger.info({ event: "SIGINT" });
  shutdownGracefully();
});

bootstrap();