import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/common/types/database";

/**
 * Returns a singleton instance of the Supabase client for the browser.
 * Ensures that Supabase URL and Anon Key are defined in environment variables.
 * @returns The Supabase client instance.
 * @throws Will throw an error if Supabase URL or Anon Key are not defined.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

function getSupabaseClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be defined in environment variables.");
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}

export const supabase = getSupabaseClient();
