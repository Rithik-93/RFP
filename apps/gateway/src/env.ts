import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string(),
    AI_SERVICE_URL: z.string().default('http://localhost:3003'),
    EMAIL_SERVICE_URL: z.string().default('http://localhost:3002'),
});

export const env = envSchema.parse(process.env);
