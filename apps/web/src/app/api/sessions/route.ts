import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import { createSession } from "@/server/services/session.service";

/**
 * Creates a new modeling session for the authenticated user
 *
 * @returns NextResponse - The newly created Session object or error response
 */
export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = body.name || "New Design";

    const session = await createSession(userId, name);

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
