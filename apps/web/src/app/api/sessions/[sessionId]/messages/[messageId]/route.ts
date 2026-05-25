import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import { getMessageById, updateMessage, deleteMessage } from "@/server/services/session.service";

/**
 * Retrieves a specific chat message from a session
 *
 * This route fetches a single chat message by ID from a session, ensuring that only
 * the authenticated user who owns the session can access the message.
 *
 * Retrieves a specific chat message from a session.
 *
 * This route fetches a single chat message by ID from a session, ensuring that only
 * the authenticated user who owns the session can access the message.
 *
 * @param request - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @param context.params.sessionId - The ID of the session the message belongs to.
 * @param context.params.messageId - The ID of the message to retrieve.
 * @returns A `NextResponse` containing the message data or an error response.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  const resolvedParams = await context.params;
  const { sessionId, messageId } = resolvedParams;

  if (!sessionId || !messageId) {
    console.error("[MessagesIdRoute] GET: Session ID or Message ID is required but not provided.");
    return NextResponse.json({ error: "Session ID and Message ID are required." }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.error(
      `[MessagesIdRoute] GET: Unauthorized access attempt for session ${sessionId}, message ${messageId}. No authenticated user ID.`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const message = await getMessageById(sessionId, messageId, userId);
    if (!message) {
      console.error(
        `[MessagesIdRoute] GET: Message ${messageId} not found for session ${sessionId} (User: ${userId}).`
      );
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    return NextResponse.json(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[MessagesIdRoute] GET: Failed to get message ${messageId} for session ${sessionId} (User: ${userId}):`,
      errorMessage
    );
    return NextResponse.json({ error: "Failed to retrieve message." }, { status: 500 });
  }
}

/**
 * Updates a specific chat message in a session
 *
 * This route updates a single chat message by ID in a session, ensuring that only
 * the authenticated user who owns the session can modify the message.
 *
 * Updates a specific chat message in a session.
 *
 * This route updates a single chat message by ID in a session, ensuring that only
 * the authenticated user who owns the session can modify the message.
 *
 * @param request - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @param context.params.sessionId - The ID of the session the message belongs to.
 * @param context.params.messageId - The ID of the message to update.
 * @returns A `NextResponse` containing the updated message or an error response.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  const resolvedParams = await context.params;
  const { sessionId, messageId } = resolvedParams;

  if (!sessionId || !messageId) {
    console.error("[MessagesIdRoute] PUT: Session ID or Message ID is required but not provided.");
    return NextResponse.json({ error: "Session ID and Message ID are required." }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.error(
      `[MessagesIdRoute] PUT: Unauthorized access attempt for session ${sessionId}, message ${messageId}. No authenticated user ID.`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      console.error(
        `[MessagesIdRoute] PUT: Invalid content type for message ${messageId} in session ${sessionId}. Content must be a string.`
      );
      return NextResponse.json({ error: "Content must be a string." }, { status: 400 });
    }

    const updatedMessage = await updateMessage(sessionId, messageId, { content }, userId);
    return NextResponse.json(updatedMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[MessagesIdRoute] PUT: Failed to update message ${messageId} for session ${sessionId} (User: ${userId}):`,
      errorMessage
    );
    return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
  }
}

/**
 * Deletes a specific chat message from a session
 *
 * This route deletes a single chat message by ID from a session, ensuring that only
 * the authenticated user who owns the session can delete the message.
 *
 * Deletes a specific chat message from a session.
 *
 * This route deletes a single chat message by ID from a session, ensuring that only
 * the authenticated user who owns the session can delete the message.
 *
 * @param request - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @param context.params.sessionId - The ID of the session the message belongs to.
 * @param context.params.messageId - The ID of the message to delete.
 * @returns A `NextResponse` containing the deletion confirmation or an error response.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  const resolvedParams = await context.params;
  const { sessionId, messageId } = resolvedParams;

  if (!sessionId || !messageId) {
    console.error("[MessagesIdRoute] DELETE: Session ID or Message ID is required but not provided.");
    return NextResponse.json({ error: "Session ID and Message ID are required." }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.error(
      `[MessagesIdRoute] DELETE: Unauthorized access attempt for session ${sessionId}, message ${messageId}. No authenticated user ID.`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedId = await deleteMessage(sessionId, messageId, userId);
    return NextResponse.json({ success: true, deletedId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[MessagesIdRoute] DELETE: Failed to delete message ${messageId} for session ${sessionId} (User: ${userId}):`,
      errorMessage
    );
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}
