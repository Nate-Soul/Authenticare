import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),

    // Which repository implementation to wire up. Delete the driver folder
    // you don't need under src/shared/db/ and drop the other option here.
    DB_DRIVER: z.enum(["mongo", "postgres"]).default("mongo"),
    MONGO_URI: z.string().optional(),
    DATABASE_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_TTL: z.string().default("30d"),
    REFRESH_TOKEN_TTL_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60 * 1000),

    BCRYPT_COST: z.coerce.number().int().min(12).default(12),

    CORS_ORIGIN: z.string().default("http://localhost:3000"),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    APP_URL: z.string().url().default("http://localhost:5000"),
    MAIL_DRIVER: z.enum(["console", "smtp"]).default("console"),
    MAIL_FROM: z.string().default("ARC <no-reply@example.com>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // NOTE: do not use z.coerce.boolean() here — it applies Boolean(str), so the
    // string "false" coerces to true. Match the literal instead.
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    VERIFY_TOKEN_TTL_MS: z.coerce.number().int().positive().default(24 * 60 * 60 * 1000),
    RESET_TOKEN_TTL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),

    QUEUE_DRIVER: z.enum(["inline", "bullmq"]).default("inline"),
    REDIS_URL: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.DB_DRIVER === "mongo" && !val.MONGO_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MONGO_URI is required when DB_DRIVER=mongo",
        path: ["MONGO_URI"],
      });
    }
    if (val.DB_DRIVER === "postgres" && !val.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL is required when DB_DRIVER=postgres",
        path: ["DATABASE_URL"],
      });
    }
    if (val.MAIL_DRIVER === "smtp" && (!val.SMTP_HOST || !val.SMTP_PORT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SMTP_HOST and SMTP_PORT are required when MAIL_DRIVER=smtp",
        path: ["SMTP_HOST"],
      });
    }
    if (val.QUEUE_DRIVER === "bullmq" && !val.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "REDIS_URL is required when QUEUE_DRIVER=bullmq",
        path: ["REDIS_URL"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
