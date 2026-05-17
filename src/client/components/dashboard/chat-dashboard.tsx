"use client";

import { useState, useCallback } from "react";
import { ChatInterface } from "@/client/components/dashboard/chat-interface";
import { AppSidebar } from "@/client/components/dashboard/app-sidebar";
import { useSocket } from "@/client/providers/socket-provider";
import { useMessages, useSession } from "@/client/hooks/use-session";
import { useSessionEvents } from "@/client/hooks/use-session-events";
import { useCreditEvents } from "@/client/hooks/use-credits";
import { ChatMessage, Session, ChatMessageAttachment } from "@/common/types";
import { useRouter } from "next/navigation";
import { ModelViewer } from "@/client/components/dashboard/model-viewer";

interface ChatDashboardProps {
  sessionId: string;
  initialMessages: ChatMessage[];
  sessionMetadata: Session;
}

export function ChatDashboard({
  sessionId,
  initialMessages,
  sessionMetadata: initialSessionMetadata,
}: ChatDashboardProps) {
  const router = useRouter();

  const { socket, isConnected, sendMessage, isAgentLoading, modelReloadKey } = useSocket();

  // Fetch chat messages and session metadata
  const { data: chatMessages = [], isLoading: isLoadingMessages } = useMessages(sessionId);
  const { data: sessionData } = useSession(sessionId);

  const sessionMetadata = sessionData || initialSessionMetadata;

  useSessionEvents({ sessionId, socket, isSocketReady: isConnected });
  useCreditEvents();

  const handleSendMessage = async (message: string, attachments?: ChatMessageAttachment[]) => {
    if (!isConnected) {
      console.warn("[ChatDashboard] Cannot send message - socket not connected.");
      return;
    }
    sendMessage(message, sessionId, attachments);
  };

  return (
    <div className="flex h-full bg-white relative">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0">
        {/* Chat Section */}
        <div className="w-[450px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white print:hidden">
          <ChatInterface
            sessionId={sessionId}
            messages={chatMessages}
            isLoading={isAgentLoading || isLoadingMessages}
            isSocketReady={isConnected}
            onSendMessage={handleSendMessage}
            onToggleCustomerInfo={() => {}}
            sessionCost={sessionMetadata.cost_usd ?? 0}
          />
        </div>

        {/* 3D Model Viewer Section */}
        <div className="flex-1 min-w-0 bg-gray-950 relative p-4">
          <ModelViewer sessionId={sessionId} reloadKey={modelReloadKey} />
        </div>
      </div>

    </div>
  );
}

