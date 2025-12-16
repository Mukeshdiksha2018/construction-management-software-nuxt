import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

// Server-side Supabase client - created lazily
export const getSupabaseServer = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NUXT_SUPABASE_URL;
  const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Please set NUXT_SUPABASE_URL and NUXT_SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};

// For backward compatibility, export as a getter
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseServer()[prop as keyof SupabaseClient];
  }
});
