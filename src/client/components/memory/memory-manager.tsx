"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/client/components/ui/select";
import { Loader2, Plus, Trash2, Search, Brain } from "lucide-react";
import { toast } from "sonner";
import { UserMemoryEntry } from "@/server/services/userMemory.service";

const CATEGORIES = ["Personal", "Work", "Preferences", "Other"];

export function MemoryManager() {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("Personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
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
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
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

  const filteredEntries = memoryEntries?.filter(
    (entry) =>
      entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    addMutation.mutate({ key: newKey, value: newValue, category: newCategory });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 pb-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
          />
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className={`rounded-xl transition-all duration-300 font-sans font-medium ${isAdding ? "bg-gray-100 text-gray-900 hover:bg-gray-200" : "bg-yellow-400 text-gray-900 hover:bg-yellow-300 hover:scale-105 shadow-lg shadow-yellow-400/20"}`}
        >
          {isAdding ? (
            "Cancel"
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-5 bg-gray-50/80 rounded-xl border border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Key / Topic</Label>
              <Input
                placeholder="e.g., Job Title"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Value / Detail</Label>
            <Textarea
              placeholder="e.g., Senior Software Engineer"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400/50 min-h-[80px]"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all font-sans font-medium"
            >
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Memory
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : filteredEntries?.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-10 w-10 text-gray-300" />
            </div>
            <p className="font-medium text-gray-600">No memories found</p>
            <p className="text-sm mt-1">Add some information to help the AI know you better.</p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredEntries?.map((entry, index) => (
              <div
                key={entry.key}
                className="flex items-start justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-yellow-400 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{entry.key}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{entry.value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this memory?")) {
                      deleteMutation.mutate(entry.key);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
