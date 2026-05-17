"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/client/components/ui/dialog";
import { Brain } from "lucide-react";
import { MemoryManager } from "./memory-manager";

interface MemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemoryModal({ open, onOpenChange }: MemoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-3 font-heading text-2xl font-bold text-gray-900">
            <div className="p-2 bg-yellow-400/20 rounded-lg">
              <Brain className="h-6 w-6 text-yellow-600" />
            </div>
            Memory Bank
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-sans text-base mt-2">
            Manage the information the AI remembers about you to personalize your experience.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-4">
          <MemoryManager />
        </div>
      </DialogContent>
    </Dialog>
  );
}
