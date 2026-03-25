import express from "express";
import cors from "cors";
import helmet from "helmet";
import v1Routes from "@/routes/v1"
import { errorHandler } from "@/middleware/error.middleware";
import { logger } from "@/utils/logger";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use("/api/v1", v1Routes);

app.get('/health', (_req, res) => {
  logger.info({ event: "health_check", uptime: process.uptime() }, "Health check requested");
  res.status(200).json({
    status: 'ok',
    service: 'saas-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  logger.info({ event: "root_endpoint" }, "Root endpoint accessed");
  res.status(200).json({
    success: true,
    message: "Backend is online",
  });
});

app.use(errorHandler);

export default app;