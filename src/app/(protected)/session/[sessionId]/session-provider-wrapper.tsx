"use client";

import { SocketProvider } from "@/client/providers/socket-provider";
import { ChatDashboard } from "@/client/components/dashboard/chat-dashboard";
import { ChatMessage, Session } from "@/common/types";

interface SessionProviderWrapperProps {
  sessionId: string;
  initialMessages: ChatMessage[];
  sessionMetadata: Session;
}

export function SessionProviderWrapper({ sessionId, initialMessages, sessionMetadata }: SessionProviderWrapperProps) {
  // The callbacks are now handled directly in ChatDashboard
  // SocketProvider just needs to emit the events, which ChatDashboard will handle
  return (
    <SocketProvider sessionId={sessionId}>
      <ChatDashboard sessionId={sessionId} initialMessages={initialMessages} sessionMetadata={sessionMetadata} />
    </SocketProvider>
  );
}
