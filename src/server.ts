import 'dotenv/config';
import http from 'http';
import app from './app'
import { connectDB, closeDB } from './config/db';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server: http.Server | undefined;

const startServer = async() => {
    try {
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
            logger.info({
                event: "server_started",
                port: PORT,
                environment: NODE_ENV
            }, `Server is running in ${NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.fatal({
                event: "server_startup_failed",
                error: error.message
            }, "Server startup failed");
            process.exit(1);
        }
    }
};

let isShuttingDown = false;

const shutdownGracefully = (exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ event: "shutdown_initiated" }, "Graceful shutdown initiated");

    if (server) {
        server.close(async() => {
            await closeDB();
            logger.info({ event: "shutdown_complete" }, "Server and database closed gracefully");
            process.exit(exitCode);
        });

        setTimeout(() => {
            logger.error({ event: "shutdown_timeout" }, "Forced shutdown after timeout");
            process.exit(exitCode);
        }, 10000).unref();
    }
    else {
        process.exit(exitCode);
        }
};

process.on("unhandledRejection", (err) => {
    logger.fatal({
        event: "unhandled_rejection",
        error: err
    }, "Unhandled promise rejection");
    shutdownGracefully(1);
});

process.on("uncaughtException", (err) => {
    logger.fatal({
        event: "uncaught_exception",
        error: err
    }, "Uncaught exception");
    shutdownGracefully(1);
});

process.on("SIGTERM", () => {
    logger.info({ event: "signal_received", signal: "SIGTERM" }, "SIGTERM received. Shutting down...");
    shutdownGracefully();
});

process.on("SIGINT", () => {
    logger.info({ event: "signal_received", signal: "SIGINT" }, "SIGINT received. Shutting down...");
    shutdownGracefully();
});

startServer();