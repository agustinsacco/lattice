import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/server/services/session.service";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server"; // Import the utility function

/**
 * Retrieves session metadata and initiates AI agent process if needed
 *
 * This route fetches session metadata for a specific session ID, ensuring that only
 * the authenticated user who owns the session can access it. If the session has
 * no messages, it initiates the AI agent process.
 *
 * @param req - The NextRequest object
 * @param params - Route parameters containing the session ID
 * @returns NextResponse - Session metadata or error response
 */
export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
  }

  try {
    const userId = await getAuthenticatedUserId(); // Get the authenticated user ID
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const metadata = await getSession(sessionId, userId); // Pass userId to getSession

    if (!metadata) {
      return NextResponse.json({ error: "Session not found or not owned by user." }, { status: 404 });
    }

    return NextResponse.json({
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      cost_usd: metadata.cost_usd,
      credits_used: metadata.credits_used,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to get session metadata for ${sessionId}:`, errorMessage);
    return NextResponse.json({ error: "Session not found or failed to load metadata." }, { status: 500 });
  }
}

/**
 * Deletes a session and its associated data.
 *
 * This route handles the deletion of a session, including all its messages and
 * the associated CAD models from storage. It ensures that only the authenticated
 * user who owns the session can perform the deletion.
 *
 * @param req - The NextRequest object
 * @param params - Route parameters containing the session ID
 * @returns NextResponse - Success or error response
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
  }

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteSession(sessionId, userId);

    return NextResponse.json({ message: "Session deleted successfully." }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to delete session ${sessionId}:`, errorMessage);
    return NextResponse.json({ error: "Failed to delete session." }, { status: 500 });
  }
}
