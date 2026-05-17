"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface UserMemoryEntry {
  key: string;
  value: string;
  category: string;
}

export function useMemory() {
  const queryClient = useQueryClient();

  const { data: memoryEntries, isLoading } = useQuery({
    queryKey: ["userMemory"],
    queryFn: async () => {
      const response = await fetch("/api/memory");
      if (!response.ok) {
        throw new Error("Failed to fetch memory");
      }
      return response.json() as Promise<UserMemoryEntry[]>;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (entry: { key: string; value: string; category: string }) => {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error("Failed to add entry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMemory"] });
      toast.success("Memory entry added successfully");
    },
    onError: () => {
      toast.error("Failed to add entry");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch(`/api/memory?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMemory"] });
      toast.success("Entry deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete entry");
    },
  });

  return {
    memoryEntries,
    isLoading,
    addEntry: addMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
