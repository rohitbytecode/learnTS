import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import v1Routes from '@/routes/v1';

import { logger } from '@/utils/logger';
import { successResponse } from './utils/apiResponse';
import { errorHandler } from '@/middleware/error.middleware';
import { globalRateLimiter } from './middleware/rateLimit.middleware';
import { traceMiddleware } from './middleware/trace.middleware';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed =
        env.ALLOWED_ORIGINS?.split(',')
          .map((o) => o.trim())
          .filter(Boolean) ?? [];

      if (allowed.includes(origin)) return callback(null, true);

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));

app.use(traceMiddleware);

app.use((req, _res, next) => {
  logger.info({
    event: 'incoming_request',
    traceId: req.traceId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// response status + duration
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      event: 'request_completed',
      traceId: req.traceId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });
  next();
});

app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    logger.error({ event: 'request_timeout', traceId: req.traceId });
    res.status(408).end();
  });
  next();
});

app.get('/health', async (_req, res) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  logger.info({ event: 'health_check', uptime: process.uptime() });
  res.status(200).json(
    successResponse({
      status: 'ok',
      database: dbStatus,
      service: 'saas-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
});

app.get('/', (_req, res) => {
  logger.info({ event: 'root_endpoint' }, 'Root endpoint accessed');
  res.status(200).json(successResponse(null, 'Backend is online'));
});

app.use(globalRateLimiter);
app.use('/api/v1', v1Routes);

app.use(errorHandler);

export default app;
