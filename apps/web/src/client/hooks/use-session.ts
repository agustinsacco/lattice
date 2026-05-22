import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as sessionService from "@/client/api/session.service"; // Assuming the service is created
import type { Session, ChatMessage } from "@lattice/shared/types";

/**
 * Fetches session metadata.
 * @param sessionId The ID of the session to fetch.
 */
export function useSession(sessionId: string) {
  return useQuery<Session, Error>({
    queryKey: ["session", sessionId],
    queryFn: () => sessionService.getSession(sessionId), // Delegate to service
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionId,
  });
}

/**
 * Fetches chat messages for a session.
 * @param sessionId The ID of the session to fetch messages for.
 */
export function useMessages(sessionId: string) {
  return useQuery<{ messages: ChatMessage[] }, Error, ChatMessage[]>({
    queryKey: ["messages", sessionId],
    queryFn: () => sessionService.getMessages(sessionId), // This will fetch the object { messages: [] }
    staleTime: 1000 * 60, // 1 minute
    enabled: !!sessionId,
    // Use the select option to transform the data and return only the messages array
    select: (data) => data.messages,
  });
}

/**
 * Provides a mutation function for sending a message.
 * @param sessionId The ID of the session to send a message to.
 */
export function useSendMessage(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: Omit<ChatMessage, "id" | "timestamp">) => {
      return sessionService.sendMessage(sessionId, message); // Delegate to service
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["messages", sessionId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<{ messages: ChatMessage[] }>(["messages", sessionId]);

      // Optimistically update to the new value
      queryClient.setQueryData<{ messages: ChatMessage[] }>(["messages", sessionId], (old) => {
        const tempId = `optimistic-${Date.now()}`; // Temporary ID for optimistic message
        const tempTimestamp = Date.now(); // Use number for timestamp
        const oldMessages = old?.messages || []; // Safely access the messages array
        return { messages: [...oldMessages, { ...newMessage, id: tempId, timestamp: tempTimestamp }] };
      });

      return { previousMessages };
    },
    onSuccess: () => {
      // Invalidate and refetch the messages query
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
    },
    onError: (err, newMessage, context) => {
      console.error("[useSendMessage] Failed to send message. Reverting optimistic update.", err);
      // If the mutation fails, use the context we returned from onMutate to roll back
      queryClient.setQueryData(["messages", sessionId], context?.previousMessages);
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
    },
  });
}
