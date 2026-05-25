import { NextRequest, NextResponse } from "next/server";
import { getMessages, appendMessage } from "@/server/services/session.service";
import { ChatMessage } from "@lattice/shared/types";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server"; // Import the utility function

/**
 * Retrieves chat messages for a specific session.
 *
 * This route fetches all chat messages for a session, ensuring that only
 * the authenticated user who owns the session can access the messages.
 *
 * @param request - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @returns A `NextResponse` containing the messages array or an error response.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await context.params;
  const { sessionId } = resolvedParams;

  if (!sessionId) {
    console.error("[MessagesRoute] GET: Session ID is required but not provided.");
    return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId(); // Get the authenticated user ID
  if (!userId) {
    console.error(
      `[MessagesRoute] GET: Unauthorized access attempt for session ${sessionId}. No authenticated user ID.`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messagesData = await getMessages(sessionId, userId);
    return NextResponse.json({ sessionId: messagesData.sessionId, messages: messagesData.messages });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[MessagesRoute] GET: Failed to get messages for session ${sessionId} (User: ${userId}):`, errorMessage);
    return NextResponse.json({ error: "Failed to retrieve messages." }, { status: 500 });
  }
}

/**
 * Adds a new chat message to a specific session.
 *
 * This route appends a new chat message to a session, ensuring that only
 * the authenticated user who owns the session can add messages.
 *
 * @param request - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @returns A `NextResponse` containing the new message or an error response.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await context.params;
  const { sessionId } = resolvedParams;

  if (!sessionId) {
    console.error("[MessagesRoute] POST: Session ID is required but not provided.");
    return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId(); // Get the authenticated user ID
  if (!userId) {
    console.error(
      `[MessagesRoute] POST: Unauthorized access attempt for session ${sessionId}. No authenticated user ID.`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { role, content, type, toolName, toolInput, toolOutput } = body;

    if (!role || !content) {
      console.error(`[MessagesRoute] POST: Role and content are required for a new message for session ${sessionId}.`);
      return NextResponse.json({ error: "Role and content are required for a new message." }, { status: 400 });
    }

    const newMessage: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      type,
      toolName,
      toolInput,
      toolOutput,
    };

    await appendMessage(sessionId, newMessage, userId);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[MessagesRoute] POST: Failed to add message to session ${sessionId} (User: ${userId}):`, errorMessage);
    return NextResponse.json({ error: "Failed to add message." }, { status: 500 });
  }
}
