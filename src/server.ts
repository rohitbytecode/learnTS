import 'dotenv/config';
import http from 'http';
import app from './app'
import { connectDB, closeDB } from './config/db';

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
        //console.log("PostgreS connected successfully");

        server = http.createServer(app);

        server.listen(PORT, () => {
            console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("Startup error: ", error.message);
            process.exit(1);
        }
    }
};

let isShuttingDown = false;

const shutdownGracefully = (exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (server) {
        server.close(async() => {
            await closeDB();
            console.log("Server and DB closed gracefully");
            process.exit(exitCode);
        });

        setTimeout(() => {
            console.error("Forced shutdown after timeout");
            process.exit(exitCode);
        }, 10000).unref();
    }
    else {
        process.exit(exitCode);
        }
};

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection: ", err);
    shutdownGracefully(1);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception: ", err);
    shutdownGracefully(1);
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down...");
    shutdownGracefully();
});

process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down...");
    shutdownGracefully();
});

startServer();