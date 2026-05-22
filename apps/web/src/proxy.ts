import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@lattice/shared/types/database";

export async function proxy(request: NextRequest) {
  // This response object is created once and will be modified by the Supabase client.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In middleware, you might prefer to just log and return instead of throwing
    console.error("Supabase credentials are not set in middleware.");
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        // The request cookies are immutable, so we need to create a new header
        // But the response cookies can be modified directly.
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // This call is essential to refresh the session cookie
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/socketio (socket.io connection)
     * - api/auth (auth routes handled by Supabase)
     * - api/upload (upload route, handled separately for session)
     * - api/chat (chat route, handled separately for session)
     * - api/pdf (pdf route, handled separately for session)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/socketio|api/auth|api/upload|api/chat|api/pdf).*)",
  ],
};
