import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import { supabaseAdmin } from "@/server/lib/supabase";
import { Tables } from "@lattice/shared/types/database";

type SessionRow = Tables<"sessions">;

/**
 * Retrieves all sessions for the authenticated user
 *
 * This route fetches all session metadata for the authenticated user,
 * ensuring that only the user's own sessions are returned.
 *
 * @param req - The NextRequest object
 * @returns NextResponse - Array of session metadata or error response
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query Supabase for user's sessions
    const { data: sessions, error } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Failed to fetch sessions for user ${userId}:`, error);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Transform sessions to match expected format
    const transformedSessions = sessions.map((session: SessionRow) => ({
      id: session.id,
      name: session.name ?? "Untitled",
      createdAt: new Date(session.created_at ?? 0).getTime(),
      updatedAt: new Date(session.updated_at ?? 0).getTime(),
      cost_usd: session.cost_usd ?? 0,
      credits_used: session.credits_used ?? 0,
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error: any) {
    console.error("Error in user sessions API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
