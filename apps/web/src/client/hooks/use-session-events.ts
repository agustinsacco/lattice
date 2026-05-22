"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Socket } from "socket.io-client";
import { Session } from "@lattice/shared/types";

interface UseSessionEventsOptions {
  sessionId: string | null;
  socket: Socket | null;
  isSocketReady: boolean;
}

export function useSessionEvents({ sessionId, socket, isSocketReady }: UseSessionEventsOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !sessionId || !isSocketReady) return;

    const handleSessionCostUpdated = ({ session }: { session: Session }) => {
      // Update the session query data
      queryClient.setQueryData(["session", sessionId], (oldSession: Session | undefined) => {
        if (!oldSession) return session;
        return {
          ...oldSession,
          cost_usd: session.cost_usd,
          // Update other fields if necessary, but cost is the main one changing frequently
        };
      });
    };

    socket.on("sessionCostUpdated", handleSessionCostUpdated);

    return () => {
      socket.off("sessionCostUpdated", handleSessionCostUpdated);
    };
  }, [socket, sessionId, isSocketReady, queryClient]);
}
