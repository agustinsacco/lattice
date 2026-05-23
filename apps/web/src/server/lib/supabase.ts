import { createClient } from "@supabase/supabase-js";
import type { Database } from "@lattice/shared/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

// During build time, this might be missing. We provide a dummy value to prevent build failure.
// The key must be in JWT format (3 parts) to pass supabase-js validation.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "header.payload.signature";

if (!supabaseServiceRoleKey && process.env.NODE_ENV !== "production") {
  console.warn("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Supabase client for server-side operations using the service role key.
 *
 * This client has elevated privileges and should ONLY be used on the server.
 * It bypasses Row Level Security (RLS) and is used for backend tasks that
 * require direct database access without user authentication context.
 *
 * Authentication features like session persistence and auto-refresh are disabled
 * as they are not relevant for a server-side admin client.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
