import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@lattice/shared/types/database";

/**
 * Creates a Supabase client for server-side operations (Server Components, API Routes).
 * This client uses the `NEXT_PUBLIC_SUPABASE_ANON_KEY` and relies on cookies for session management.
 * It is intended for operations that require user context and respect Row Level Security (RLS).
 *
 * @returns A Supabase client instance.
 * @throws Error if required Supabase environment variables are missing.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use anon key for user-level client

  if (!supabaseUrl) {
    console.error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    console.error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey, // Use anon key here
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, _options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );
}

/**
 * Retrieves the authenticated user's ID from the current session.
 *
 * This function creates a Supabase client and attempts to get the user from the session.
 * It logs any authentication errors and returns `null` if no user is found or an error occurs,
 * allowing the caller to handle unauthorized access gracefully.
 *
 * @returns The authenticated user's ID if available, otherwise `null`.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error(
      "[Supabase Server] Authentication error in getAuthenticatedUserId:",
      error?.message || "User not found"
    );
    return null;
  }
  return user.id;
}
