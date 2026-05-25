import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/client/supabase/client";
import { useEffect } from "react";
import { useOptionalSocket } from "@/client/providers/socket-provider";

import { CreditTransaction } from "@lattice/shared/types";

/**
 * Fetches the current user's credit balance.
 */
export function useCredits() {
  return useQuery<number, Error>({
    queryKey: ["credits", "balance"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch("/api/user/credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = await response.json();
      return data.credits?.balance ?? 0;
    },
    staleTime: Infinity, // We rely on socket updates or manual invalidation
  });
}

/**
 * Fetches the user's credit transaction history.
 */
export function useCreditTransactions(sessionId?: string, options?: { enabled?: boolean }) {
  return useQuery<CreditTransaction[], Error>({
    queryKey: ["credits", "transactions", sessionId || "all"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const url = sessionId ? `/api/sessions/${sessionId}/credits` : "/api/user/credits";

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      return data.transactions || [];
    },
    staleTime: Infinity,
    enabled: options?.enabled,
  });
}

/**
 * Mutation to add credits (for testing/demo purposes).
 */
export function useAddCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch("/api/user/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) throw new Error("Failed to add credits");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}

/**
 * Hook to listen for real-time credit updates via socket.
 */
export function useCreditEvents() {
  const socketContext = useOptionalSocket();
  const socket = socketContext?.socket;
  const isConnected = socketContext?.isConnected;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserCreditsUpdated = (data: { credits: number; transaction: Record<string, unknown> }) => {
      // Update balance
      queryClient.setQueryData(["credits", "balance"], data.credits);

      // Update transactions list (optimistically add the new transaction)
      // We need to be careful with the query keys.
      // 1. Global transactions
      queryClient.setQueryData<CreditTransaction[]>(["credits", "transactions", "all"], (old) => {
        if (!old) return [data.transaction as unknown as CreditTransaction];
        // Avoid duplicates if possible, though ID check is better
        // Ensure sessionId is preserved from the event data
        return [data.transaction as unknown as CreditTransaction, ...old];
      });

      // 2. Session transactions (if we know the session ID from the transaction, but the event might not have it easily accessible in the generic handler unless we pass it)
      // The event payload I designed in session.service.ts didn't include sessionId in the top level, but it's in the transaction object if I added it.
      // Let's check session.service.ts again. I didn't add sessionId to the transaction object in the emit.
      // I should probably add it to be safe, or just invalidate.
      // For now, invalidating "transactions" is safer and easy enough.
      queryClient.invalidateQueries({ queryKey: ["credits", "transactions"] });
    };

    socket.on("userCreditsUpdated", handleUserCreditsUpdated);

    return () => {
      socket.off("userCreditsUpdated", handleUserCreditsUpdated);
    };
  }, [socket, isConnected, queryClient]);
}

/**
 * Mutation to create a Stripe checkout session and redirect to payment.
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async (packageId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");
      const data = await response.json();
      return data.url as string;
    },
  });
}
