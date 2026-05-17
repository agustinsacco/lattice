// src/client/api/session.service.ts (New Content)

import { Session, ChatMessage, SessionVersion } from "@/common/types";

export const getSession = async (sessionId: string): Promise<Session> => {
  const response = await fetch(`/api/sessions/${sessionId}`);
  if (!response.ok) {
    console.error("[session.service] Failed to fetch session:", response.status, response.statusText);
    throw new Error("Failed to fetch session");
  }
  const data = await response.json();
  return data;
};

export const createSession = async (data: object): Promise<Session> => {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    console.error("[session.service] Failed to create session:", response.status, response.statusText);
    throw new Error("Failed to create session");
  }
  const dataResponse = await response.json();
  return dataResponse;
};

export const getMessages = async (sessionId: string): Promise<{ messages: ChatMessage[] }> => {
  const response = await fetch(`/api/sessions/${sessionId}/messages`);
  if (!response.ok) {
    console.error("[session.service] Failed to fetch messages:", response.status, response.statusText);
    throw new Error("Failed to fetch messages");
  }
  const data = await response.json();
  return data;
};

export const sendMessage = async (
  sessionId: string,
  message: Omit<ChatMessage, "id" | "timestamp">
): Promise<ChatMessage> => {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    console.error("[session.service] Failed to send message:", response.status, response.statusText);
    throw new Error("Failed to send message");
  }
  const data = await response.json();
  return data;
};

export async function fetchSessionVersions(sessionId: string): Promise<SessionVersion[]> {
  const response = await fetch(`/api/sessions/${sessionId}/versions`);
  if (!response.ok) {
    throw new Error("Failed to fetch session versions.");
  }
  return response.json();
}

export async function restoreSessionVersion(sessionId: string, targetVersion: number): Promise<{ success: boolean }> {
  const response = await fetch(`/api/sessions/${sessionId}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetVersion }),
  });
  if (!response.ok) {
    throw new Error("Failed to restore session.");
  }
  return response.json();
}
