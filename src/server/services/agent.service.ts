import { Server } from "socket.io";
import { getMessages, replaceMessages, getSession } from "@/server/services/session.service";
import { getUserCredits } from "@/server/services/credit.service";
import { ChatMessage, TextPart, ImagePart, FilePart, ToolCallPart, ToolResultPart } from "@/common/types";

console.log("[AgentService] Module loaded. getSession is:", typeof getSession);
import {
  ModelMessage,
  AssistantModelMessage,
  ToolModelMessage,
  UserModelMessage,
  SystemModelMessage,
  UserContent,
  AssistantContent,
  ToolContent,
} from "ai";
import { v4 as uuidv4 } from "uuid";

/**
 * Maps a user role ChatMessage to a UserModelMessage.
 * Handles parsing of stringified JSON content if necessary.
 *
 * @param msg - The user ChatMessage.
 * @returns The mapped UserModelMessage.
 */
function mapUserMessage(msg: ChatMessage): UserModelMessage {
  let contentToProcess = msg.content;

  // Attempt to parse string content if it looks like JSON
  if (typeof contentToProcess === "string") {
    try {
      const parsed = JSON.parse(contentToProcess);
      if (Array.isArray(parsed)) {
        contentToProcess = parsed;
      }
    } catch {
      // Not JSON, keep as string
    }
  }

  const userContent: UserContent = Array.isArray(contentToProcess)
    ? (contentToProcess
        .filter((part): part is TextPart | ImagePart => part.type === "text" || part.type === "image")
        .map((part) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          } else if (part.type === "image") {
            return { type: "image", image: part.image, mimeType: part.mediaType };
          }
          return part;
        }) as UserContent)
    : (contentToProcess as string);

  return {
    role: "user",
    content: userContent,
  };
}

/**
 * Maps an assistant role ChatMessage to an AssistantModelMessage.
 * Handles parsing of stringified JSON content and filtering for text/tool-call parts.
 *
 * @param msg - The assistant ChatMessage.
 * @returns The mapped AssistantModelMessage.
 */
function mapAssistantMessage(msg: ChatMessage): AssistantModelMessage {
  let assistantContent: AssistantContent;

  if (typeof msg.content === "string") {
    try {
      // If content is a stringified JSON array, parse it.
      const parsedContent = JSON.parse(msg.content);
      if (Array.isArray(parsedContent)) {
        assistantContent = parsedContent.filter(
          (part): part is TextPart | ToolCallPart => part.type === "text" || part.type === "tool-call"
        ) as AssistantContent;
      } else {
        // If it's a plain string, wrap it in a TextPart.
        assistantContent = [{ type: "text", text: msg.content }];
      }
    } catch {
      // If parsing fails, treat it as a plain text string.
      assistantContent = [{ type: "text", text: msg.content }];
    }
  } else if (Array.isArray(msg.content)) {
    // If it's already an array, filter it as before.
    assistantContent = msg.content.filter(
      (part): part is TextPart | ToolCallPart => part.type === "text" || part.type === "tool-call"
    ) as AssistantContent;
  } else {
    // Fallback for any other unexpected type.
    assistantContent = [{ type: "text", text: String(msg.content) }];
  }

  return {
    role: "assistant",
    content: assistantContent,
  };
}

/**
 * Maps a tool role ChatMessage to a ToolModelMessage.
 * Handles parsing of stringified JSON content and formatting tool results.
 *
 * @param msg - The tool ChatMessage.
 * @returns The mapped ToolModelMessage.
 */
function mapToolMessage(msg: ChatMessage): ToolModelMessage {
  let toolContent: ToolContent;
  let contentSource: unknown = msg.content;

  // Try parsing content if it's a string
  if (typeof contentSource === "string") {
    try {
      contentSource = JSON.parse(contentSource);
    } catch {
      // Not a JSON string, proceed with it as a plain string
    }
  }

  if (Array.isArray(contentSource)) {
    toolContent = contentSource
      .filter((part): part is ToolResultPart => part.type === "tool-result")
      .map((part) => {
        const actualOutput = part.output ?? undefined;
        let processedOutput: {
          type: "content";
          value: Array<{ type: "text"; text: string }>;
        };

        if (actualOutput === undefined || actualOutput === null) {
          processedOutput = {
            type: "content",
            value: [{ type: "text", text: "no output" }],
          };
        } else if (typeof actualOutput === "string") {
          processedOutput = {
            type: "content",
            value: [{ type: "text", text: actualOutput }],
          };
        } else if (typeof actualOutput === "object") {
          processedOutput = {
            type: "content",
            value: [{ type: "text", text: JSON.stringify(actualOutput) }],
          };
        } else {
          processedOutput = {
            type: "content",
            value: [{ type: "text", text: String(actualOutput) }],
          };
        }
        return { ...part, output: processedOutput };
      });
  } else {
    // Fallback for non-array content (e.g., plain string or other types)
    const fallbackOutput = msg.toolOutput ?? msg.content ?? "no output";
    let processedOutput: {
      type: "content";
      value: Array<{ type: "text"; text: string }>;
    };

    if (typeof fallbackOutput === "string") {
      processedOutput = {
        type: "content",
        value: [{ type: "text", text: fallbackOutput }],
      };
    } else if (typeof fallbackOutput === "object" && fallbackOutput !== null) {
      processedOutput = {
        type: "content",
        value: [{ type: "text", text: JSON.stringify(fallbackOutput) }],
      };
    } else {
      processedOutput = {
        type: "content",
        value: [{ type: "text", text: String(fallbackOutput) }],
      };
    }

    toolContent = [
      {
        type: "tool-result",
        toolCallId: msg.id || uuidv4(),
        toolName: msg.toolName || "unknown_tool",
        output: processedOutput,
      },
    ];
  }

  return {
    role: "tool",
    content: toolContent,
  };
}

/**
 * Maps a system role ChatMessage to a SystemModelMessage.
 *
 * @param msg - The system ChatMessage.
 * @returns The mapped SystemModelMessage.
 */
function mapSystemMessage(msg: ChatMessage): SystemModelMessage {
  return {
    role: "system",
    content: Array.isArray(msg.content) ? (msg.content[0] as TextPart).text : (msg.content as string),
  };
}

/**
 * Maps a single ChatMessage object to a ModelMessage object for the AI SDK.
 * This handles different message types (text, tool-call, tool-result) and roles.
 *
 * The AI SDK expects:
 * - Assistant messages with tool calls: content array with tool-call parts
 * - Tool messages: content array with tool-result parts
 * - Text messages: simple string content or array with text parts
 *
 * @param msg - The ChatMessage object to map.
 * @returns The mapped ModelMessage object.
 */
export function mapChatMessageToModelMessage(msg: ChatMessage): ModelMessage {
  switch (msg.role) {
    case "user":
      return mapUserMessage(msg);
    case "assistant":
      return mapAssistantMessage(msg);
    case "tool":
      return mapToolMessage(msg);
    case "system":
      return mapSystemMessage(msg);
    default:
      // Fallback for any unhandled roles, though with the new ChatMessage role definition, this should be rare.
      return {
        role: "user",
        content: Array.isArray(msg.content) ? (msg.content[0] as TextPart).text : (msg.content as string),
      } as UserModelMessage;
  }
}

/**
 * Maps an array of ChatMessage objects to an array of ModelMessage objects for the AI SDK.
 * This function is a wrapper around `mapChatMessageToModelMessage` for batch processing.
 *
 * @param messages - An array of ChatMessage objects to map.
 * @returns An array of mapped ModelMessage objects.
 */
function mapChatMessagesToModelMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map(mapChatMessageToModelMessage);
}

export function prepareContextWindow(messages: ChatMessage[]): {
  agentMessages: ChatMessage[];
  persistedMessages: ChatMessage[];
} {
  // Increase max context significantly to favor caching over truncation
  // Gemini can handle 1M+ tokens, so keeping the last 40 messages is safe and stable.
  const STABLE_MAX_CONTEXT = 40; 
  
  if (messages.length <= STABLE_MAX_CONTEXT) {
    return { agentMessages: messages, persistedMessages: messages };
  }

  // To maintain KV cache hits, we should keep the conversation contiguous as long as possible.
  // Instead of a sliding window in the middle, we just take the LAST N messages.
  // Note: We MUST always include the System prompt (this is handled in getAgent).
  // If the conversation is too long, we take the most recent 40.
  const agentMessages = messages.slice(-STABLE_MAX_CONTEXT);
  const persistedMessages = messages.slice(-STABLE_MAX_CONTEXT);

  return { agentMessages, persistedMessages };
}

/**
 * Orchestrates the AI agent's interaction with a session.
 * Fetches message history, adds an initial prompt if needed, instantiates the agent,
 * and handles agent responses, including error handling and Socket.io emissions.
 * Errors during the agent process are caught, logged, and an error message is emitted
 * to the client via Socket.io.
 *
 * @param sessionId - The ID of the current session.
 * @param userId - The ID of the authenticated user.
 * @param io - The Socket.io server instance for real-time communication.
 */
import { sandboxService } from "./sandbox.service";

/**
 * Orchestrates the AI agent's interaction with a session using a K3s Sandbox.
 * 
 * @param sessionId - The ID of the current session.
 * @param userId - The ID of the authenticated user.
 * @param io - The Socket.io server instance for real-time communication.
 */
export async function startAgentProcess(sessionId: string, userId: string, io: Server) {
  io.to(sessionId).emit("agentLoading", { isLoading: true });
  console.log(`[AgentService] Starting Lattice agent process for session ${sessionId}.`);

  try {
    // 1. Pre-flight checks
    const userCredits = await getUserCredits(userId);
    if (!userCredits || userCredits.balance < 0.1) {
      io.to(sessionId).emit("insufficientCredits", { message: "Insufficient credits." });
      io.to(sessionId).emit("agentLoading", { isLoading: false });
      return;
    }

    // 2. Trigger Sandbox Execution
    // For now, we'll call the sandbox service which will attempt to create a Pod.
    // In a development environment without K8s, this will log a warning.
    await sandboxService.runAgent(sessionId, userId, io);

    // Note: The sandboxService should handle streaming logs back via Socket.io
    // and updating the session log in Supabase when finished.
    
  } catch (error: any) {
    console.error(`[AgentService] Error:`, error);
    io.to(sessionId).emit("error", { message: "Failed to start agent sandbox." });
    io.to(sessionId).emit("agentLoading", { isLoading: false });
  }
}

