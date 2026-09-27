import { createClient } from "@supabase/supabase-js";

// Browser Supabase client, used for Realtime chat channels only.
// This file is bundled into the browser: only NEXT_PUBLIC_* values belong here. Never import or
// hard-code the service-role key in this file; server code reads it from env.SUPABASE_SERVICE_ROLE_KEY.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mcgigqdkzohrvompgzsr.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ozJUKqgUVOhrOD_yNB93Gg_MAYDZDOq";

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export { supabaseUrl, supabaseAnonKey };
