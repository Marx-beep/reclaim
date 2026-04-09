import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QUEUE_MODE: z.enum(["auto", "enabled", "disabled"]).default("auto"),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  SCHEDULER_BASE_URL: z.string().url().default("http://localhost:8000")
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(env = process.env): AppEnv {
  return envSchema.parse(env);
}
