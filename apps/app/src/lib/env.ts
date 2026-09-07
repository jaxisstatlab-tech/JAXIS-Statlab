import { z } from "zod";

const envSchema = z.object({
  // Core
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase (Realtime + Storage)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Cloudflare R2 (large file storage)
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL"),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with 're_'"),

  // Trigger.dev (background jobs)
  TRIGGER_API_KEY: z.string().min(1, "TRIGGER_API_KEY is required"),
  TRIGGER_API_URL: z.string().url("TRIGGER_API_URL must be a valid URL").default("https://api.trigger.dev"),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  if (typeof window === "undefined") {
    const parsed = envSchema.safeParse(process.env);
    if (parsed.success) {
      return parsed.data;
    }
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      console.error("❌ Missing or invalid production environment variables:", parsed.error.format());
    }
    // Return process.env with fallback in dev/build
    return process.env as unknown as Env;
  }
  return process.env as unknown as Env;
}

export const env = getEnv();
