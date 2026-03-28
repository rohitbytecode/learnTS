import { z } from 'zod';
import { logger } from '@/utils/logger';

const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    ALLOWED_ORIGINS: z.string().min(1).default("https://localhost:4200"),
    POSTGRES_PASSWORD: z.string().min(1),
    JWT_SECRET: z.string().min(10),
    NODE_ENV: z.enum(['development', 'production', 'test']).default("development"),
    PORT: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if(!parsed.success) {
    logger.error({ event: "accessing_env_variables" }, "Invalid environment variables", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;