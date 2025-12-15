import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabaseUrl = process.env.NUXT_SUPABASE_URL!;
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY!;


export const supabaseServer = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
