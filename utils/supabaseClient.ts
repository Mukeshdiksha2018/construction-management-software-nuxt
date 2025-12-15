import { createClient } from "@supabase/supabase-js";

// Singleton client instance
let supabaseClient: any = null;

// Create a composable to get the Supabase client with proper runtime config
export const useSupabaseClient = () => {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = useRuntimeConfig();

  const supabaseUrl = config.public.SUPABASE_URL;
  const supabaseAnonKey = config.public.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Missing Supabase environment variables. Please check your .env file."
    );
    // Return a mock client to prevent crashes
    supabaseClient = createClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
    return supabaseClient;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storageKey: "sb-auth-token",
      storage: process.client
        ? {
            getItem: (key) => {
              return localStorage.getItem(key);
            },
            setItem: (key, value) => {
              localStorage.setItem(key, value);
            },
            removeItem: (key) => {
              localStorage.removeItem(key);
            },
          }
        : undefined,
    },
  });

  return supabaseClient;
};

// Export a getter function for backward compatibility
// This prevents the composable from being called at module level
export const getSupabaseClient = () => useSupabaseClient();
