import { ChatMessage, Session, Json, type ChatMessageContent, type TokenUsage } from "@lattice/shared/types";
import { Database, TablesInsert, TablesUpdate } from "@lattice/shared/types/database";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type MessageInsert = TablesInsert<"messages">;
type MessageUpdate = TablesUpdate<"messages">;

/**
 * Converts a database `SessionRow` object into a common application `Session` object.
 * Handles date conversions and provides default values for potentially null fields.
 *
 * @param data - The `SessionRow` object from the database.
 * @returns The converted `Session` object.
 */
export function toSession(data: SessionRow): Session {
  return {
    id: data.id,
    userId: data.user_id ?? "",
    name: data.name ?? "",
    createdAt: data.created_at ? new Date(data.created_at).getTime() : 0,
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : 0,
    cost_usd: data.cost_usd ?? 0,
    credits_used: data.credits_used ?? 0,
    conversation_log: data.conversation_log ?? undefined,
  };
}

/**
 * Converts a partial common application `Session` object into a partial database `SessionRow` object.
 * Suitable for updating Supabase, handling date conversions.
 *
 * @param data - The partial `Session` object.
 * @returns The converted partial `SessionRow` object.
 */
export function toSessionRow(data: Partial<Session>): Partial<SessionRow> {
  const row: Partial<SessionRow> = {};
  if (data.id) row.id = data.id;
  if (data.userId) row.user_id = data.userId;
  if (data.name) row.name = data.name;
  if (data.createdAt) row.created_at = new Date(data.createdAt).toISOString();
  if (data.updatedAt) row.updated_at = new Date(data.updatedAt).toISOString();
  if (data.cost_usd !== undefined) row.cost_usd = data.cost_usd;
  if (data.credits_used !== undefined) row.credits_used = data.credits_used;
  if (data.conversation_log !== undefined) row.conversation_log = data.conversation_log;
  return row;
}

/**
 * Converts a `ChatMessage` object into a `MessageInsert` object for Supabase insertion.
 * Handles content serialization and type mapping.
 *
 * @param message - The `ChatMessage` object.
 * @param sessionId - The ID of the session the message belongs to.
 * @returns The converted `MessageInsert` object.
 */
export function toMessageRowInsert(message: ChatMessage, sessionId: string): MessageInsert {
  return {
    session_id: sessionId,
    role: message.role,
    content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
    type: message.type ?? null,
    tool_name: message.toolName ?? null,
    tool_input: message.toolInput ? (message.toolInput as Json) : null,
    tool_output: message.toolOutput ? (message.toolOutput as Json) : null,
    token_usage: message.tokenUsage ? (message.tokenUsage as unknown as Json) : null,
    attachments: message.attachments ? (JSON.stringify(message.attachments) as Json) : null, // Stringify attachments for Json column
    timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
  };
}

/**
 * Converts a partial `ChatMessage` object into a `MessageUpdate` object for Supabase update.
 * Handles content serialization and type mapping.
 *
 * @param updates - The partial `ChatMessage` object with updates.
 * @returns The converted `MessageUpdate` object.
 */
export function toMessageRowUpdate(updates: Partial<ChatMessage>): MessageUpdate {
  const updateData: MessageUpdate = {};

  if (updates.role) updateData.role = updates.role;
  if (updates.content !== undefined) {
    updateData.content = typeof updates.content === "string" ? updates.content : JSON.stringify(updates.content);
  }
  if (updates.type) updateData.type = updates.type;
  if (updates.toolName) updateData.tool_name = updates.toolName;
  if (updates.toolInput !== undefined) updateData.tool_input = updates.toolInput as Json;
  if (updates.toolOutput !== undefined) updateData.tool_output = updates.toolOutput as Json;
  if (updates.tokenUsage !== undefined) updateData.token_usage = updates.tokenUsage as unknown as Json;
  if (updates.attachments !== undefined) updateData.attachments = JSON.stringify(updates.attachments) as Json; // Stringify attachments for Json column
  if (updates.timestamp) updateData.timestamp = new Date(updates.timestamp).toISOString();

  return updateData;
}

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

/**
 * Converts a database `MessageRow` object into a common application `ChatMessage` object.
 * Handles the deserialization of JSON content, token usage, and attachments.
 *
 * @param row - The `MessageRow` from the database.
 * @returns The converted `ChatMessage` object.
 */
export function toChatMessage(row: MessageRow): ChatMessage {
  // Parse content if it's a JSON string
  let parsedContent = row.content;
  if (typeof row.content === "string") {
    try {
      if ((row.content.startsWith("[") && row.content.endsWith("]")) || 
          (row.content.startsWith("{") && row.content.endsWith("}"))) {
        parsedContent = JSON.parse(row.content);
      }
    } catch {
      // If parsing fails, treat it as a plain string
      parsedContent = row.content;
    }
  }

  // Parse attachments
  let parsedAttachments = undefined;
  if (row.attachments) {
    try {
      parsedAttachments = typeof row.attachments === "string" ? JSON.parse(row.attachments) : row.attachments;
    } catch {
      console.warn(`Failed to parse attachments for message ${row.id}`);
    }
  }

  return {
    id: row.id,
    sessionId: row.session_id ?? undefined,
    role: row.role as "user" | "assistant" | "system" | "tool",
    content: parsedContent as ChatMessageContent,
    type: (row.type as "text" | "tool-call" | "tool-result" | "grouped-tool") ?? undefined,
    toolName: row.tool_name ?? undefined,
    toolInput: row.tool_input ?? undefined,
    toolOutput: row.tool_output ?? undefined,
    tokenUsage: row.token_usage ? (row.token_usage as unknown as TokenUsage) : undefined,
    attachments: parsedAttachments,
    timestamp: row.timestamp ? new Date(row.timestamp).getTime() : undefined,
  };
}
