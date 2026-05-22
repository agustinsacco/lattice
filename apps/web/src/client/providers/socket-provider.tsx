"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import io, { Socket } from "socket.io-client";
import { useAuth } from "@/client/hooks/use-auth";
import { supabase } from "@/client/supabase/client"; // Use the singleton supabase client
import type { ChatMessage } from "@lattice/shared/types"; // Import ChatMessage
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCreditsModal } from "@/client/providers/credits-modal";

// Define the context shape
import { ChatMessageAttachment } from "@lattice/shared/types";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
  sendMessage: (message: string, sessionId: string, attachments?: ChatMessageAttachment[]) => void;
  isAgentLoading: boolean;
  toolStatus: { toolName: string; status: "start" | "end" } | null;
  isModelUpdating: boolean;
  modelReloadKey: number;
  triggerModelReload: () => void;
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const useOptionalSocket = () => {
  return useContext(SocketContext);
};

// Provider component
interface SocketProviderProps {
  sessionId: string;
  children: ReactNode;
}

/**
 * Provides a real-time WebSocket connection using Socket.io.
 * Manages the socket lifecycle and integrates with React Query for state updates.
 */
export const SocketProvider = ({ sessionId, children }: SocketProviderProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<{ toolName: string; status: "start" | "end" } | null>(null);
  const [isModelUpdating, setIsModelUpdating] = useState(false);
  const [modelReloadKey, setModelReloadKey] = useState(0);

  const triggerModelReload = useCallback(() => {
    setModelReloadKey((prev) => prev + 1);
  }, []);

  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth(); // Get user and auth loading state
  const { openModal } = useCreditsModal();

  useEffect(() => {
    // Disconnect and clean up existing socket if dependencies change to an invalid state
    if (!sessionId || !user || isAuthLoading) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Prevent re-initialization if a socket is already active
    if (socketRef.current) {
      return;
    }

    let newSocket: Socket; // Defined here to be in scope for the cleanup function

    // Use an async IIFE to handle the async logic inside the sync useEffect
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.error(`[SocketProvider] No access token found for session: ${sessionId}.`);
        setError(new Error("No access token found."));
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
      newSocket = io(socketUrl, {
        path: "/api/socketio",
        auth: { sessionId, accessToken },
        autoConnect: false, // Add listeners before connecting
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // --- Event Listeners ---
      newSocket.on("connect", () => {
        // Emit joinSession event to the server after successful connection
        newSocket.emit("joinSession", sessionId);
      });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      newSocket.on("connecting", () => {});

      newSocket.on("joinedSession", () => {
        setIsConnected(true);
        setError(null); // Clear any previous errors
      });

      newSocket.on("disconnect", () => {
        setIsConnected(false);
        socketRef.current = null; // Ensure ref is cleared on disconnect
        setSocket(null);
      });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      newSocket.on("reconnect_attempt", () => {});

      newSocket.on("connect_error", (err) => {
        console.error(`[SocketProvider] Socket connection error for session: ${sessionId}:`, err);
        setError(err);
        setIsConnected(false);
      });

      newSocket.on("error", (error: { message: string }) => {
        console.error(`[SocketProvider] Socket error for session: ${sessionId}:`, error.message);
        setError(new Error(error.message));
        setIsConnected(false);

        if (error.message === "Unauthorized") {
          newSocket.disconnect();
        }

        // Mark the last user message as failed
        queryClient.setQueryData(
          ["messages", sessionId],
          (old: { sessionId: string; messages: ChatMessage[] } | undefined) => {
            if (!old || !old.messages) return old;

            const messages = [...old.messages];
            // Find the last user message
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "user") {
                // Only mark as failed if it's an optimistic message (not yet saved/confirmed)
                if (messages[i].id.startsWith("optimistic-")) {
                  messages[i] = { ...messages[i], status: "failed" };
                }
                break;
              }
            }

            return { ...old, messages };
          }
        );
      });

      newSocket.on("agentMessage", (message: ChatMessage) => {
        queryClient.setQueryData(
          ["messages", sessionId],
          (old: { sessionId: string; messages: ChatMessage[] } | undefined) => {
            if (!old) return { sessionId, messages: [message] };
            const exists = old.messages?.some((m: ChatMessage) => m.id === message.id);
            if (exists) return old;
            return { ...old, messages: [...(old.messages || []), message] };
          }
        );
      });

      newSocket.on("modelUpdated", () => {
        setModelReloadKey((prev) => prev + 1);
        setIsModelUpdating(false);
        queryClient.invalidateQueries({ queryKey: ["model", sessionId] });
      });

      newSocket.on("agentLoading", ({ isLoading }: { isLoading: boolean }) => {
        setIsAgentLoading(isLoading);
        // Only clear toolStatus if agent is fully done
        if (!isLoading) {
          setToolStatus(null);
        }
      });

      newSocket.on("toolStatus", (status: { toolName: string; status: "start" | "end" }) => {
        if (status.status === "start") {
          setToolStatus(status);
          if (status.toolName === "write_file" || status.toolName === "bash") setIsModelUpdating(true);
        } else {
          setToolStatus(null);
        }
      });

      newSocket.on("insufficientCredits", ({ message }: { message: string }) => {
        toast.custom(
          (t) => (
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-md flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-lg text-gray-900">Credits Depleted</h3>
                  <p className="font-sans text-gray-600 mt-1">
                    {message || "You have run out of credits. Please purchase more to continue."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  openModal();
                  toast.dismiss(t);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Add Credits
              </button>
            </div>
          ),
          {
            duration: Infinity,
            id: "insufficient-credits", // Prevent duplicate toasts
          }
        );
      });

      newSocket.connect();
    })();

    // Synchronously return the cleanup function
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setSocket(null);
      }
    };
  }, [sessionId, user, isAuthLoading, queryClient, openModal]);

  const sendMessage = useCallback(
    (message: string, currentSessionId: string, attachments?: any[]) => {
      if (isConnected && socketRef.current) {
        // Optimistically update the messages list
        queryClient.setQueryData(["messages", currentSessionId], (old: any) => {
          const tempId = `optimistic-${Date.now()}`;
          let content: any = message;

          if (attachments && attachments.length > 0) {
            content = [
              { type: "text", text: message },
              ...attachments.map((att) => ({
                type: att.type,
                image: att.type === "image" ? att.data : undefined,
                data: att.type === "file" ? att.data : undefined,
                mediaType: att.mediaType,
                filename: att.filename,
              })),
            ];
          }

          const newMessage = {
            id: tempId,
            role: "user",
            content: content,
            type: "text",
            timestamp: Date.now(),
          };
          if (!old) return { sessionId: currentSessionId, messages: [newMessage] };
          return {
            ...old,
            messages: [...(old.messages || []), newMessage],
          };
        });

        socketRef.current.emit("clientMessage", { message, sessionId: currentSessionId, attachments });
        setIsAgentLoading(true); // Set agent loading to true when a message is sent
      } else {
        console.warn("Cannot send message - socket not ready or socket instance is null.");
      }
    },
    [isConnected, queryClient]
  );

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      error,
      sendMessage,
      isAgentLoading,
      toolStatus,
      isModelUpdating,
      modelReloadKey,
      triggerModelReload,
    }),
    [socket, isConnected, error, sendMessage, isAgentLoading, toolStatus, isModelUpdating, modelReloadKey, triggerModelReload]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
