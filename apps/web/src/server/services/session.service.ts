import { supabaseAdmin } from "@/server/lib/supabase";
import { SUPABASE_BUCKET_NAME } from "@lattice/shared/config";
import { ChatMessage, Session, ChatMessageAttachment, TokenUsage } from "@lattice/shared/types";
import { v4 as uuidv4 } from "uuid";

import { toSession, toSessionRow, toMessageRowInsert, toMessageRowUpdate, toChatMessage } from "../lib/mappings";
import { calculateCost, convertCostToCredits } from "./cost.service";
import { deductCredits, getUserCredits } from "./credit.service";

/**
 * Appends a new chat message to a session in the database.
 * This function also calculates the cost and deducts credits for the message tokens
 * if token usage is provided.
 *
 * @param sessionId - The ID of the session.
 * @param message - The ChatMessage object to append.
 * @param userId - The ID of the user.
 * @returns The generated ID of the new message.
 * @throws Error if the database operation fails.
 */
export async function appendMessage(sessionId: string, message: ChatMessage, userId: string): Promise<string> {
  await verifySessionOwnership(sessionId, userId);

  const messageToInsert = toMessageRowInsert(message, sessionId);

  const { data, error } = await supabaseAdmin.from("messages").insert(messageToInsert).select("id");

  if (error) {
    console.error(`[SessionService] Failed to append message to session ${sessionId}:`, error);
    throw new Error("Failed to append message.");
  }
  if (!data || data.length === 0) {
    console.error(`[SessionService] Failed to retrieve message ID after appending for session ${sessionId}.`);
    throw new Error("Failed to retrieve message ID after appending.");
  }
  return data[0].id;
}

/**
 * Retrieves all chat messages for a given session, verifying session ownership.
 *
 * @param sessionId - The ID of the session to retrieve messages from.
 * @param userId - The ID of the user requesting the messages.
 * @returns An object containing the session ID, creation timestamp, and an array of `ChatMessage` objects.
 * @throws Error if the session is not found/owned, or if message retrieval fails.
 */
export async function getMessages(
  sessionId: string,
  userId: string
): Promise<{ sessionId: string; createdAt: number; messages: ChatMessage[] }> {
  const session = await getSession(sessionId, userId); // getSession now throws if not found/owned

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error(`[SessionService] Failed to read messages for session ${sessionId}:`, error);
    throw new Error("Failed to retrieve messages.");
  }

  const messages: ChatMessage[] = data.map(toChatMessage);

  return {
    sessionId,
    createdAt: session.createdAt,
    messages,
  };
}

/**
 * Retrieves a session by its ID and verifies ownership by the given user.
 * Throws an error if the session is not found, not owned by the user, or a database error occurs.
 *
 * @param sessionId - The ID of the session to retrieve.
 * @param userId - The ID of the user who is expected to own the session.
 * @returns The `Session` object if found and owned.
 * @throws Error if the session is not found, not owned, or a database error occurs.
 */
export async function getSession(sessionId: string, userId: string): Promise<Session> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId) // Enforce ownership
    .single();

  if (error) {
    console.error(`[SessionService] Error fetching session ${sessionId} for user ${userId}:`, error);
    throw new Error(`Failed to retrieve session ${sessionId}.`);
  }

  if (!data) {
    throw new Error(`Session ${sessionId} not found or not owned by user ${userId}.`);
  }

  return toSession(data);
}

/**
 * Retrieves only the conversation log for a session.
 * 
 * @param sessionId - The ID of the session.
 * @param userId - The ID of the user.
 * @returns The conversation log string.
 */
export async function getSessionLog(sessionId: string, userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("conversation_log")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(`[SessionService] Error fetching log for session ${sessionId}:`, error);
    throw new Error("Failed to retrieve session log.");
  }

  return data?.conversation_log || "";
}

/**
 * Updates the conversation log for a session.
 * 
 * @param sessionId - The ID of the session.
 * @param log - The new conversation log string.
 * @param userId - The ID of the user.
 */
export async function updateSessionLog(sessionId: string, log: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ conversation_log: log, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error(`[SessionService] Error updating log for session ${sessionId}:`, error);
    throw new Error("Failed to update session log.");
  }
}

/**
 * Update session cost and deduct from user credits
 */
export async function updateSessionCostAndCredits(
  sessionId: string,
  tokenUsage: TokenUsage,
  userId: string,
  messageId?: string
): Promise<{ success: boolean; insufficientCredits?: boolean }> {
  // Calculate cost
  const costBreakdown = calculateCost(tokenUsage);
  const credits = convertCostToCredits(costBreakdown.totalCost);

  console.log(`[INFERENCE COST] Model: ${costBreakdown.modelName}`);
  console.log(`[INFERENCE COST] Tokens: ${tokenUsage.inputTokens} IN / ${tokenUsage.outputTokens} OUT`);
  console.log(`[INFERENCE COST] Base API Cost: $${costBreakdown.baseCost.toFixed(5)}`);
  console.log(`[INFERENCE COST] User Cost (50% Margin): $${costBreakdown.totalCost.toFixed(5)}`);
  console.log(`[INFERENCE COST] Final Credits Deducted: ${credits.toFixed(2)}`);

  // Check and reset daily credits if needed - REMOVED
  // await checkAndResetDailyCredits(userId);

  // Deduct credits
  const success = await deductCredits(
    userId,
    credits,
    `Token usage: ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output`,
    sessionId,
    messageId,
    costBreakdown.modelName,
    costBreakdown.baseCost,
    costBreakdown.margin,
    costBreakdown.inputTokens,
    costBreakdown.outputTokens
  );

  if (!success) {
    return { success: false, insufficientCredits: true };
  }

  // Update session cost (for backward compatibility)
  await updateSessionCost(sessionId, costBreakdown.totalCost, credits, userId);

  // Emit socket events for real-time updates
  if (global.io) {
    // 1. Emit session cost update to the session room
    // We need to fetch the updated session to get the new total cost
    const updatedSession = await getSession(sessionId, userId);
    global.io.to(sessionId).emit("sessionCostUpdated", { session: updatedSession });

    // 2. Emit user credits update to the user's personal room (if we had one) or just broadcast to session
    // Since we don't have a user-specific room setup in server.ts yet, we can emit to the session room
    // and let the client filter, OR we can rely on the client refetching via invalidation.
    // However, the requirement is to push updates.
    // Let's fetch the latest user credits and transaction
    const updatedUserCredits = await getUserCredits(userId);

    // We can emit to the session room, but strictly speaking this is user data.
    // For now, emitting to the session room is safe as the session is private to the user.
    if (updatedUserCredits) {
      global.io.to(sessionId).emit("userCreditsUpdated", {
        credits: updatedUserCredits.balance,
        transaction: {
          // id: uuidv4(), // Removed synthetic ID
          userId: userId,
          amount: -credits,
          description: `Token usage: ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output`,
          createdAt: new Date(),
          transactionType: "usage",
          sessionId: sessionId,
          messageId: messageId || null,
          model: costBreakdown.modelName,
          baseCost: costBreakdown.baseCost,
          margin: costBreakdown.margin,
          inputTokens: costBreakdown.inputTokens,
          outputTokens: costBreakdown.outputTokens,
        },
      });
    }
  }

  return { success: true };
}

export async function updateSessionCost(sessionId: string, costUsd: number, credits: number, _userId: string) {
  const supabase = supabaseAdmin;

  const rpc = supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
  const { error } = await rpc("increment_session_cost_v2", {
    session_id_arg: sessionId,
    cost_increment: costUsd,
    credits_increment: credits,
  });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SessionService] Atomic cost update failed for session ${sessionId}:`, errorMsg);
  }
}

/**
 * Replaces all messages for a session with a new set of messages.
 * This is used for trimming the message history to maintain a context window.
 *
 * @param sessionId - The ID of the session to update.
 * @param messages - The new array of `ChatMessage` objects to store.
 * @param userId - The ID of the user who owns the session.
 * @throws Error if session ownership verification fails or if database operations fail.
 */
export async function replaceMessages(sessionId: string, messages: ChatMessage[], userId: string): Promise<void> {
  await verifySessionOwnership(sessionId, userId);

  // Start a transaction
  const { error: deleteError } = await supabaseAdmin.from("messages").delete().eq("session_id", sessionId);

  if (deleteError) {
    console.error(`[SessionService] Failed to delete old messages for session ${sessionId}:`, deleteError);
    throw new Error("Failed to replace messages.");
  }

  const messagesToInsert = messages.map((msg) => toMessageRowInsert(msg, sessionId));

  const { error: insertError } = await supabaseAdmin.from("messages").insert(messagesToInsert);

  if (insertError) {
    console.error(`[SessionService] Failed to insert new messages for session ${sessionId}:`, insertError);
    // Potentially handle rollback or compensation logic here if needed
    throw new Error("Failed to replace messages.");
  }
}

/**
 * Verifies if a given user owns a specific session.
 * This is a helper function to centralize session ownership checks.
 *
 * @param sessionId - The ID of the session to verify.
 * @param userId - The ID of the user to check for ownership.
 * @throws Error if the session is not found or not owned by the user.
 */
async function verifySessionOwnership(sessionId: string, userId: string): Promise<void> {
  try {
    await getSession(sessionId, userId);
  } catch (error) {
    console.error(
      `[SessionService] Session ownership verification failed for session ${sessionId} and user ${userId}:`,
      error
    );
    throw new Error("Session not found or not owned by user.");
  }
}

/**
 * Updates the metadata for a specific session, verifying session ownership.
 *
 * @param sessionId - The ID of the session to update.
 * @param metadata - A `Partial<Session>` object containing the fields to update.
 * @param userId - The ID of the user updating the session.
 * @returns The updated `Session` object.
 * @throws Error if the session is not found/owned, or if the update fails.
 */
export async function updateSession(sessionId: string, metadata: Partial<Session>, userId: string): Promise<Session> {
  await verifySessionOwnership(sessionId, userId);

  const updates = toSessionRow(metadata);
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 0) {
    return await getSession(sessionId, userId); // Return the existing session if no updates
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("user_id", userId) // Enforce ownership
    .select()
    .single();

  if (error) {
    console.error(`[SessionService] Failed to update metadata for session ${sessionId}:`, error);
    throw new Error("Failed to update session metadata.");
  }

  if (!data) {
    console.error(`[SessionService] No data returned after updating session ${sessionId}.`);
    throw new Error("Failed to retrieve updated session data.");
  }

  return toSession(data);
}

/**
 * Retrieves a specific chat message by its ID within a session, verifying session ownership.
 *
 * @param sessionId - The ID of the session the message belongs to.
 * @param messageId - The ID of the message to retrieve.
 * @param userId - The ID of the user requesting the message.
 * @returns The `ChatMessage` object if found, otherwise `undefined`.
 * @throws Error if the session is not found/owned, or if message retrieval fails.
 */
export async function getMessageById(
  sessionId: string,
  messageId: string,
  userId: string
): Promise<ChatMessage | undefined> {
  await verifySessionOwnership(sessionId, userId);

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("id", messageId)
    .single();

  if (error) {
    console.error(`[SessionService] Failed to get message ${messageId} for session ${sessionId}:`, error);
    // Do not throw here, as the spec says to return undefined if not found
    return undefined;
  }

  if (!data) {
    return undefined;
  }

  return toChatMessage(data);
}

/**
 * Updates a specific chat message within a session, verifying session ownership.
 *
 * @param sessionId - The ID of the session the message belongs to.
 * @param messageId - The ID of the message to update.
 * @param updates - A `Partial<ChatMessage>` object containing the fields to update.
 * @param userId - The ID of the user updating the message.
 * @returns The updated `ChatMessage` object.
 * @throws Error if the session is not found/owned, or if the message update fails.
 */
export async function updateMessage(
  sessionId: string,
  messageId: string,
  updates: Partial<ChatMessage>,
  userId: string
): Promise<ChatMessage> {
  await verifySessionOwnership(sessionId, userId);

  const messageToUpdate = toMessageRowUpdate(updates);

  const { data, error } = await supabaseAdmin
    .from("messages")
    .update(messageToUpdate)
    .eq("id", messageId)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) {
    console.error(`[SessionService] Failed to update message ${messageId} for session ${sessionId}:`, error);
    throw new Error("Failed to update message.");
  }
  if (!data) {
    console.error(`[SessionService] No data returned after updating message ${messageId} for session ${sessionId}.`);
    throw new Error("Failed to retrieve updated message data.");
  }
  return {
    id: data.id,
    role: data.role as ChatMessage["role"],
    content: data.content,
    type: (data.type as ChatMessage["type"]) ?? undefined,
    toolName: data.tool_name ?? undefined,
    toolInput: data.tool_input ?? undefined,
    toolOutput: data.tool_output ?? undefined,
    tokenUsage: data.token_usage ? (data.token_usage as unknown as TokenUsage) : undefined,
    attachments: data.attachments
      ? ((typeof data.attachments === "string"
          ? JSON.parse(data.attachments)
          : data.attachments) as ChatMessageAttachment[])
      : undefined,
    timestamp: data.timestamp ? new Date(data.timestamp).getTime() : undefined,
  };
}

/**
 * Deletes a specific chat message from a session, verifying session ownership.
 *
 * @param sessionId - The ID of the session the message belongs to.
 * @param messageId - The ID of the message to delete.
 * @param userId - The ID of the user deleting the message.
 * @returns The ID of the deleted message.
 * @throws Error if the session is not found/owned, or if the message deletion fails.
 */
export async function deleteMessage(sessionId: string, messageId: string, userId: string): Promise<string> {
  await verifySessionOwnership(sessionId, userId);

  const { error } = await supabaseAdmin.from("messages").delete().eq("id", messageId).eq("session_id", sessionId);

  if (error) {
    console.error(`[SessionService] Failed to delete message ${messageId} for session ${sessionId}:`, error);
    throw new Error("Failed to delete message.");
  }
  return messageId;
}

/**
 * Deletes a session, its messages, and associated storage folder.
 * Verifies session ownership before deletion.
 *
 * @param sessionId - The ID of the session to delete.
 * @param userId - The ID of the user deleting the session.
 * @returns The ID of the deleted session.
 * @throws Error if the session is not found/owned, or if deletion fails.
 */
export async function deleteSession(sessionId: string, userId: string): Promise<string> {
  await verifySessionOwnership(sessionId, userId);

  // 1. Delete messages for the session
  const { error: messagesError } = await supabaseAdmin.from("messages").delete().eq("session_id", sessionId);

  if (messagesError) {
    console.error(`[SessionService] Failed to delete messages for session ${sessionId}:`, messagesError);
    throw new Error("Failed to delete session messages.");
  }

  // 2. Delete the session itself
  const { error: sessionError } = await supabaseAdmin
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (sessionError) {
    console.error(`[SessionService] Failed to delete session ${sessionId}:`, sessionError);
    throw new Error("Failed to delete session.");
  }

  // 3. Delete the storage folder
  const { data: files, error: listError } = await supabaseAdmin.storage.from(SUPABASE_BUCKET_NAME).list(sessionId);

  if (listError) {
    console.error(`[SessionService] Failed to list files for session ${sessionId}:`, listError);
  }

  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${sessionId}/${file.name}`);
    const { error: removalError } = await supabaseAdmin.storage.from(SUPABASE_BUCKET_NAME).remove(filePaths);

    if (removalError) {
      console.error(`[SessionService] Failed to remove files for session ${sessionId}:`, removalError);
    }
  }

  return sessionId;
}

/**
 * Creates a new session for a given user.
 *
 * @param userId - The ID of the user creating the session.
 * @param name - The name of the session.
 * @returns The newly created `Session` object.
 * @throws Error if the session creation fails.
 */
export async function createSession(userId: string, name = "New Design"): Promise<Session> {
  const newSessionId = uuidv4();
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      id: newSessionId,
      user_id: userId,
      name,
    })
    .select()
    .single();

  if (error) {
    console.error(`[SessionService] Failed to create session for user ${userId}:`, error);
    throw new Error("Failed to create session.");
  }

  return toSession(data);
}
