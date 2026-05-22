import { Json } from "./database"; // Re-export Json from database.ts
export type { Json };

export interface UserCredits {
  userId: string;
  balance: number;
  dailyCreditsLastReset: Date | null;
  hasReceivedWelcomeCredits: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: "daily_reset" | "usage" | "purchase" | "refund" | "manual_add" | "welcome_bonus";
  description: string | null;
  sessionId: string | null;
  messageId: string | null;
  model: string | null;
  baseCost: number | null;
  margin: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}

export interface SessionVersion {
  versionNumber: number;
  createdAt: string | Date;
}

export type ChatMessageContent = string | Array<TextPart | ImagePart | FilePart | ToolCallPart | ToolResultPart>;

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image";
  image: string; // base64 encoded or URL
  mediaType?: string;
}

export interface FilePart {
  type: "file";
  data: string; // base64 encoded or URL
  filename?: string;
  mediaType: string;
}

export interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: unknown; // Can be various types, not just stringified JSON
}

export interface ChatMessage {
  id?: string;
  sessionId?: string;
  role: "user" | "assistant" | "tool" | "system";
  content: ChatMessageContent;
  timestamp?: number;
  status?: "pending" | "confirmed" | "failed";
  type?: "text" | "tool-call" | "tool-result" | "tool-response" | "grouped-tool" | "error";
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  toolCall?: ChatMessage;
  toolResult?: ChatMessage;
  tokenUsage?: TokenUsage;
  cost?: number; // Added cost property
  attachments?: ChatMessageAttachment[]; // Added attachments property
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  modelName: string;
}

export interface ChatMessageAttachment {
  type: "file" | "image";
  data: string; // base64 encoded or URL
  filename?: string;
  mediaType: string;
}

export interface Session {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cost_usd: number;
  credits_used: number;
  conversation_log?: string; // Stores the raw JSONL string for the Blob/File model
}
