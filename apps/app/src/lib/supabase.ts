import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Supabase client configuration for Realtime & Storage
// Statically referenced NEXT_PUBLIC_* variables allow Next.js compiler to inline them in browser bundles
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof window === "undefined" ? env.NEXT_PUBLIC_SUPABASE_URL : "") ||
  "https://mcgigqdkzohrvompgzsr.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof window === "undefined" ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY : "") ||
  "sb_publishable_ozJUKqgUVOhrOD_yNB93Gg_MAYDZDOq";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (typeof window === "undefined" ? env.SUPABASE_SERVICE_ROLE_KEY : "") ||
  "sb_secret_7zXr2Po9k8-kIW0u3Ju5gQ_QUSpaFMk";

// Browser client — used in Client Components for Realtime subscriptions
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

// Server client — used in Server Components / API Routes for Storage & administrative operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };



