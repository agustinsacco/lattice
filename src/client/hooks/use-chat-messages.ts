"use client";

import { useMemo } from "react";
import { ChatMessage } from "@/common/types";

// Helper to generate unique IDs for messages
const generateUniqueId = (prefix: string = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/**
 * Normalizes a message from either the API or the local state.
 * Handles database field mapping (snake_case to camelCase) and type adjustments.
 */
const normalizeMessage = (msg: ChatMessage) => {
  if (!msg) return null;
  return {
    ...msg,
    type: msg.type === "tool-result" ? "tool-response" : msg.type,
    toolName: msg.toolName || (msg as any).tool_name,
    toolInput: msg.toolInput || (msg as any).tool_input,
    toolOutput: msg.toolOutput || (msg as any).tool_output,
    tokenUsage: msg.tokenUsage || (msg as any).token_usage,
  };
};

/**
 * Attempts to parse stringified JSON content if it represents a tool call/result.
 * This handles legacy messages or messages coming from non-part-aware sources.
 */
const tryParseToolContent = (msg: ChatMessage): ChatMessage => {
  if (!msg || typeof msg.content !== "string") return msg;

  const isToolCall = msg.content.includes('"type":"tool-call"');
  const isToolResult = msg.content.includes('"type":"tool-result"');

  if (!isToolCall && !isToolResult) return msg;

  try {
    const parts = JSON.parse(msg.content);
    if (!Array.isArray(parts)) return msg;

    if (isToolCall) {
      const toolCall = parts.find((p: any) => p.type === "tool-call");
      if (toolCall) {
        return {
          ...msg,
          type: "tool-call",
          toolName: toolCall.toolName,
          toolInput: toolCall.args || toolCall.input,
          content: "",
        };
      }
    } else if (isToolResult) {
      const toolResult = parts.find((p: any) => p.type === "tool-result");
      if (toolResult) {
        return {
          ...msg,
          type: "tool-result",
          toolName: toolResult.toolName,
          toolOutput: toolResult.output,
          content: "",
        };
      }
    }
  } catch (e) {
    console.warn("Failed to parse tool JSON content:", e);
  }
  return msg;
};

export function useChatMessages(messages: ChatMessage[]) {
  const processedMessages = useMemo(() => {
    const rawList = Array.isArray(messages)
      ? messages
      : (messages as any)?.messages || [];

    // 1. Pre-process: Parse tool content
    const baseMessages = rawList.map(tryParseToolContent);

    const newMessages: ChatMessage[] = [];
    const usedIndices = new Set<number>();

    // 2. Grouping & Normalization Loop
    for (let i = 0; i < baseMessages.length; i++) {
      if (usedIndices.has(i)) continue;

      const msg = normalizeMessage(baseMessages[i]);
      if (!msg) continue;

      if (msg.type === "tool-call") {
        // Look ahead for a matching response
        let responseIdx = -1;
        for (let j = i + 1; j < baseMessages.length; j++) {
          if (usedIndices.has(j)) continue;
          const possibleResponse = normalizeMessage(baseMessages[j]);
          if (possibleResponse?.type === "tool-response" && possibleResponse.toolName === msg.toolName) {
            responseIdx = j;
            break;
          }
        }

        if (responseIdx !== -1) {
          // Found a match!
          usedIndices.add(responseIdx);
          const nextMsg = normalizeMessage(baseMessages[responseIdx]);
          newMessages.push({
            id: msg.id || generateUniqueId(`grouped-${i}`),
            role: "assistant",
            type: "grouped-tool",
            status: "complete",
            toolCall: msg,
            toolResult: nextMsg,
            content: "",
          } as any);
        } else {
          // No response found yet, it's truly pending
          newMessages.push({
            id: msg.id || generateUniqueId(`pending-${i}`),
            role: "assistant",
            type: "grouped-tool",
            status: "pending",
            toolCall: msg,
            toolResult: null,
            content: "",
          } as any);
        }
      } else if (msg.type === "tool-response") {
        // This is an orphaned response (shouldn't happen with our look-ahead)
        continue;
      } else {
        // Regular message
        newMessages.push({
          ...msg,
          id: msg.id || generateUniqueId(`msg-${i}`),
        });
      }
    }

    return newMessages;
  }, [messages]);

  return processedMessages;
}
