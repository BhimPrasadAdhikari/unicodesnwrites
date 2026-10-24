import { z } from 'zod';

const optionalEmail = z.preprocess(
  (val) => (typeof val === 'string' && z.string().email().safeParse(val.trim()).success ? val.trim() : undefined),
  z.string().email().optional()
);

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MongoDB URI required"),
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(32, "Secret must be at least 32 chars").optional().default("supersecretdefaultkeyforlocaldevelopmentonly"),
  EMAIL_HOST: z.string().min(1).optional().default("smtp.gmail.com"),
  EMAIL_PORT: z.string().default("587").transform((val) => parseInt(val, 10)),
  EMAIL_USER: optionalEmail,
  EMAIL_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: optionalEmail,
  EMAIL_FROM_NAME: z.string().min(1).optional().default("Unicode & Writes"),
  ANALYTICS_ENABLED: z.string().optional().default("false").transform((val) => val === 'true'),
});

export const env = envSchema.parse(process.env);
