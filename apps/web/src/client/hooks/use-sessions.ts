"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Session } from "@lattice/shared/types/index";

export function useSessions() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", "user"],
    queryFn: async () => {
      const response = await fetch("/api/sessions/user");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      return data.sessions as Session[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove session");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "user"] });
      toast.success("Session removed successfully");
    },
    onError: (error) => {
      console.error("Error removing session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove session");
    },
  });

  return {
    sessions,
    isLoading,
    deleteSession: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
